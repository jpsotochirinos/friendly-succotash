import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Blueprint,
  BlueprintOverride,
  BlueprintVersion,
  BlueprintResolvedSnapshot,
  Organization,
  ProcessTrack,
} from '@tracker/db';
import { BlueprintScope } from '@tracker/shared';
import {
  applyOverridesToTree,
  type OverrideRow,
  type ResolvedTree,
  resolvedTreeToJson,
} from '@tracker/shared';
import { blueprintVersionToSnapshot } from './blueprint-tree.mapper';

@Injectable()
export class BlueprintResolverService {
  constructor(private readonly em: EntityManager) {}

  private mapOverride(o: BlueprintOverride): OverrideRow {
    return {
      id: o.id,
      targetType: o.targetType,
      targetCode: o.targetCode,
      operation: o.operation,
      patch: o.patch,
    };
  }

  /**
   * Walks `parentBlueprint` until `scope === SYSTEM`.
   */
  async resolveSystemRoot(from: Blueprint): Promise<Blueprint> {
    let current: Blueprint | null = from;
    const visited = new Set<string>();
    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      if (current.scope === BlueprintScope.SYSTEM) return current;
      if (!current.parentBlueprint) break;
      current = await this.em.findOne(Blueprint, { id: (current.parentBlueprint as { id: string }).id });
    }
    if (from.scope === BlueprintScope.SYSTEM) return from;
    throw new Error('Blueprint has no SYSTEM ancestor');
  }

  /**
   * Builds resolved tree: SYSTEM version + TENANT/INSTANCE `BlueprintOverride` rows.
   */
  /**
   * Catalog / editor preview: SYSTEM blueprints (published version, no org overrides) or TENANT (full resolve).
   */
  async resolveForBlueprintCatalog(
    blueprintId: string,
    organizationId: string,
    opts?: { versionId?: string },
  ): Promise<ResolvedTree> {
    const bp = await this.em.findOne(Blueprint, { id: blueprintId }, { populate: ['currentVersion', 'organization'] });
    if (!bp) throw new NotFoundException('Blueprint not found');
    if (bp.scope === BlueprintScope.TENANT && bp.organization?.id !== organizationId) {
      throw new NotFoundException('Blueprint not found');
    }
    if (bp.scope === BlueprintScope.SYSTEM) {
      if (!bp.currentVersion) throw new NotFoundException('System blueprint has no current version');
      const verId = (bp.currentVersion as { id: string }).id;
      const version = await this.em.findOne(
        BlueprintVersion,
        { id: verId },
        {
          populate: [
            'stageTemplates',
            'stageTemplates.activities',
            'stageTemplates.documentSuggestions',
            'deadlineRules',
            'sinoeKeywordRules',
          ],
        },
      );
      if (!version) throw new NotFoundException('Version not found');
      const base = blueprintVersionToSnapshot(version);
      return applyOverridesToTree(base, [], [], true);
    }
    return this.resolveForTenantBlueprint(blueprintId, organizationId, opts);
  }

  /**
   * Preview/editor: resolve TENANT blueprint version + that blueprint's `BlueprintOverride` rows.
   */
  async resolveForTenantBlueprint(
    tenantBlueprintId: string,
    organizationId: string,
    opts?: { versionId?: string },
  ): Promise<ResolvedTree> {
    const bp = await this.em.findOne(Blueprint, {
      id: tenantBlueprintId,
      organization: organizationId,
      scope: BlueprintScope.TENANT,
    });
    if (!bp) throw new NotFoundException('Tenant blueprint not found');
    let ver: BlueprintVersion | null = null;
    if (opts?.versionId) {
      ver = await this.em.findOne(BlueprintVersion, { id: opts.versionId, blueprint: { id: bp.id } });
    } else {
      if (bp.currentVersion) {
        ver = await this.em.findOne(BlueprintVersion, { id: (bp.currentVersion as { id: string }).id });
      }
    }
    if (!ver) {
      const parentId = (bp.parentBlueprint as { id: string } | undefined)?.id;
      if (parentId) {
        const parent = await this.em.findOne(Blueprint, { id: parentId }, { populate: ['currentVersion'] });
        if (parent?.currentVersion) {
          ver = await this.em.findOne(BlueprintVersion, { id: (parent.currentVersion as { id: string }).id });
        }
      }
    }
    if (!ver) throw new NotFoundException('No blueprint version to resolve');
    await this.em.populate(ver, [
      'stageTemplates',
      'stageTemplates.activities',
      'stageTemplates.documentSuggestions',
      'deadlineRules',
      'sinoeKeywordRules',
    ]);
    const base = blueprintVersionToSnapshot(ver);
    const rows = await this.em.find(BlueprintOverride, { blueprint: { id: bp.id } });
    return applyOverridesToTree(
      base,
      rows.map((r) => this.mapOverride(r)),
      undefined,
      true,
    );
  }

  async resolveForProcessTrack(processTrack: ProcessTrack): Promise<ResolvedTree> {
    const instBp = await this.em.findOne(Blueprint, { id: processTrack.blueprint.id });
    if (!instBp) throw new Error('ProcessTrack blueprint not found');
    const sys = await this.resolveSystemRoot(instBp);
    if (!sys.currentVersion) {
      throw new Error('System blueprint has no currentVersion');
    }
    const version = await this.em.findOne(
      BlueprintVersion,
      { id: sys.currentVersion.id },
      {
        populate: [
          'stageTemplates',
          'stageTemplates.activities',
          'stageTemplates.documentSuggestions',
          'deadlineRules',
          'sinoeKeywordRules',
        ],
      },
    );
    if (!version) throw new Error('Blueprint version not found');
    const base = blueprintVersionToSnapshot(version);
    const tenantOvr: OverrideRow[] = [];
    if (instBp.scope === BlueprintScope.INSTANCE && instBp.parentBlueprint) {
      const parent = await this.em.findOne(Blueprint, { id: (instBp.parentBlueprint as { id: string }).id });
      if (parent?.scope === BlueprintScope.TENANT) {
        const rows = await this.em.find(BlueprintOverride, { blueprint: { id: parent.id } });
        for (const r of rows) tenantOvr.push(this.mapOverride(r));
      }
    }
    const instRows = await this.em.find(BlueprintOverride, { blueprint: { id: instBp.id } });
    const instOvr = instRows.map((r) => this.mapOverride(r));
    return applyOverridesToTree(base, tenantOvr, instOvr, true);
  }

  /**
   * Persists or updates `blueprint_resolved_snapshots` for a process track.
   */
  async persistSnapshotForProcessTrack(processTrack: ProcessTrack): Promise<BlueprintResolvedSnapshot> {
    const pt = await this.em.findOne(
      ProcessTrack,
      { id: processTrack.id },
      { populate: ['trackable', 'trackable.organization'] },
    );
    if (!pt) throw new Error('ProcessTrack not found');
    const resolved = await this.resolveForProcessTrack(pt);
    const orgId = (pt.trackable as { organization: { id: string } }).organization.id;
    const existing = await this.em.findOne(BlueprintResolvedSnapshot, {
      processTrack: { id: pt.id },
    });
    const json = resolvedTreeToJson(resolved) as Record<string, unknown>;
    if (existing) {
      existing.resolvedTreeJson = json;
      existing.sourceVersionIds = resolved.sourceVersionIds;
      existing.resolvedAt = new Date();
      await this.em.flush();
      return existing;
    }
    const snap = this.em.create(BlueprintResolvedSnapshot, {
      organization: this.em.getReference(Organization, orgId),
      processTrack: this.em.getReference(ProcessTrack, pt.id),
      resolvedTreeJson: json,
      sourceVersionIds: resolved.sourceVersionIds,
      resolvedAt: new Date(),
    } as any);
    await this.em.persistAndFlush(snap);
    return snap;
  }

  async invalidateSnapshotByProcessTrackId(processTrackId: string): Promise<void> {
    const row = await this.em.findOne(BlueprintResolvedSnapshot, { processTrack: { id: processTrackId } });
    if (row) {
      await this.em.removeAndFlush(row);
    }
  }
}
