import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  ActivityTemplate,
  Blueprint,
  BlueprintOverride,
  BlueprintVersion,
  DeadlineRule,
  DocumentSuggestion,
  SinoeKeywordRule,
  StageTemplate,
  User,
} from '@tracker/db';
import { BlueprintDocumentType, BlueprintScope, MatterType } from '@tracker/shared';

@Injectable()
export class BlueprintsService {
  constructor(private readonly em: EntityManager) {}

  async listCatalog(organizationId: string, matterType?: string) {
    const system = await this.em.find(Blueprint, {
      scope: BlueprintScope.SYSTEM,
      isActive: true,
      ...(matterType ? { matterType: matterType as MatterType } : {}),
    });
    const tenant = await this.em.find(Blueprint, {
      scope: BlueprintScope.TENANT,
      organization: { id: organizationId },
      isActive: true,
      ...(matterType ? { matterType: matterType as MatterType } : {}),
    });
    return { system, tenant };
  }

  async getOne(id: string, organizationId: string) {
    const bp = await this.em.findOne(
      Blueprint,
      { id },
      { populate: ['currentVersion', 'parentBlueprint', 'organization'] },
    );
    if (!bp) throw new NotFoundException('Blueprint not found');
    if (bp.scope === BlueprintScope.TENANT && bp.organization?.id !== organizationId) {
      throw new NotFoundException('Blueprint not found');
    }
    return bp;
  }

  /**
   * Create a TENANT blueprint pointing at a SYSTEM parent (no structural copy; overrides only).
   */
  async adoptSystemBlueprint(
    organizationId: string,
    systemBlueprintId: string,
    code: string,
    name: string,
  ) {
    const sys = await this.em.findOne(Blueprint, {
      id: systemBlueprintId,
      scope: BlueprintScope.SYSTEM,
    });
    if (!sys) throw new NotFoundException('System blueprint not found');
    const exists = await this.em.findOne(Blueprint, {
      organization: { id: organizationId },
      code,
    });
    if (exists) throw new BadRequestException('code already in use for this organization');
    const bp = this.em.create(Blueprint, {
      scope: BlueprintScope.TENANT,
      organization: organizationId,
      code,
      name,
      parentBlueprint: sys,
      matterType: sys.matterType,
      applicableLaw: sys.applicableLaw,
      legalReferences: sys.legalReferences ? [...sys.legalReferences] : undefined,
      isActive: true,
    } as any);
    await this.em.persistAndFlush(bp);
    return bp;
  }

  async listVersions(blueprintId: string, organizationId: string) {
    const bp = await this.getOne(blueprintId, organizationId);
    if (bp.scope !== BlueprintScope.TENANT) {
      throw new BadRequestException('Versions list is for tenant blueprints');
    }
    return this.em.find(BlueprintVersion, { blueprint: { id: bp.id } }, { orderBy: { versionNumber: 'DESC' } });
  }

  /** Compare two published versions (plain tree snapshots for JSON diff in UI). */
  async diffVersions(
    blueprintId: string,
    v1: number,
    v2: number,
    organizationId: string,
  ): Promise<{ left: unknown; right: unknown }> {
    await this.getOne(blueprintId, organizationId);
    const a = await this.em.findOne(BlueprintVersion, { blueprint: { id: blueprintId }, versionNumber: v1 });
    const b = await this.em.findOne(BlueprintVersion, { blueprint: { id: blueprintId }, versionNumber: v2 });
    if (!a || !b) throw new NotFoundException('Version not found');
    const { blueprintVersionToSnapshot } = await import('./blueprint-tree.mapper');
    await this.em.populate(a, ['stageTemplates.activities', 'stageTemplates.documentSuggestions', 'deadlineRules', 'sinoeKeywordRules']);
    await this.em.populate(b, ['stageTemplates.activities', 'stageTemplates.documentSuggestions', 'deadlineRules', 'sinoeKeywordRules']);
    return { left: blueprintVersionToSnapshot(a), right: blueprintVersionToSnapshot(b) };
  }

  async createOverride(
    blueprintId: string,
    organizationId: string,
    body: {
      targetType: BlueprintOverride['targetType'];
      targetCode?: string;
      operation: BlueprintOverride['operation'];
      patch: Record<string, unknown>;
      reason?: string;
      userId: string;
    },
  ) {
    const bp = await this.getOne(blueprintId, organizationId);
    if (bp.scope === BlueprintScope.SYSTEM) {
      throw new BadRequestException('Cannot add overrides on system blueprint');
    }
    const o = this.em.create(BlueprintOverride, {
      organization: organizationId,
      blueprint: bp,
      targetType: body.targetType,
      targetCode: body.targetCode,
      operation: body.operation,
      patch: body.patch,
      editedBy: this.em.getReference(User, body.userId),
      editedAt: new Date(),
      reason: body.reason,
    } as any);
    await this.em.persistAndFlush(o);
    return o;
  }

  async listOverrides(blueprintId: string, organizationId: string) {
    const bp = await this.getOne(blueprintId, organizationId);
    if (bp.scope === BlueprintScope.SYSTEM) {
      throw new BadRequestException('System blueprints have no instance overrides in this list');
    }
    return this.em.find(BlueprintOverride, { blueprint: { id: bp.id } }, { orderBy: { createdAt: 'DESC' } });
  }

  async updateOverride(
    blueprintId: string,
    overrideId: string,
    organizationId: string,
    body: { patch?: Record<string, unknown>; reason?: string; userId: string },
  ) {
    const bp = await this.getOne(blueprintId, organizationId);
    if (bp.scope === BlueprintScope.SYSTEM) throw new BadRequestException();
    const o = await this.em.findOne(BlueprintOverride, { id: overrideId, blueprint: { id: bp.id } });
    if (!o) throw new NotFoundException();
    if (o.isLocked) throw new BadRequestException('Override is locked');
    if (body.patch) o.patch = { ...o.patch, ...body.patch };
    if (body.reason !== undefined) o.reason = body.reason;
    o.editedBy = this.em.getReference(User, body.userId);
    o.editedAt = new Date();
    await this.em.flush();
    return o;
  }

  async deleteOverride(blueprintId: string, overrideId: string, organizationId: string) {
    const bp = await this.getOne(blueprintId, organizationId);
    if (bp.scope === BlueprintScope.SYSTEM) throw new BadRequestException();
    const o = await this.em.findOne(BlueprintOverride, { id: overrideId, blueprint: { id: bp.id } });
    if (!o) throw new NotFoundException();
    if (o.isLocked) throw new BadRequestException('Override is locked');
    await this.em.removeAndFlush(o);
  }

  /**
   * Create a TENANT blueprint (after selecting a system parent) with an initial **draft** version.
   */
  async createTenantBlueprint(organizationId: string, systemBlueprintId: string, code: string, name: string) {
    return this.createTenantWithDraftFromParent(organizationId, systemBlueprintId, code, name);
  }

  private async createTenantWithDraftFromParent(
    organizationId: string,
    systemBlueprintId: string,
    code: string,
    name: string,
  ) {
    const sys = await this.em.findOne(Blueprint, {
      id: systemBlueprintId,
      scope: BlueprintScope.SYSTEM,
    }, { populate: ['currentVersion'] });
    if (!sys?.currentVersion) throw new NotFoundException('System blueprint or version not found');
    const exists = await this.em.findOne(Blueprint, { organization: { id: organizationId }, code });
    if (exists) throw new BadRequestException('code already in use for this organization');
    const bp = this.em.create(Blueprint, {
      scope: BlueprintScope.TENANT,
      organization: organizationId,
      code,
      name,
      parentBlueprint: sys,
      matterType: sys.matterType,
      applicableLaw: sys.applicableLaw,
      legalReferences: sys.legalReferences ? [...sys.legalReferences] : undefined,
      isActive: true,
    } as any);
    await this.em.persistAndFlush(bp);
    const draft = await this.createNewDraftFromSource(
      bp,
      await this.loadVersionForClone(sys.currentVersion.id),
      1,
      organizationId,
    );
    bp.currentVersion = draft;
    await this.em.flush();
    return bp;
  }

  private async loadVersionForClone(versionId: string) {
    const v = await this.em.findOne(
      BlueprintVersion,
      { id: versionId },
      { populate: ['stageTemplates.activities', 'stageTemplates.documentSuggestions', 'deadlineRules', 'sinoeKeywordRules'] },
    );
    if (!v) throw new NotFoundException('Source version not found');
    return v;
  }

  private async createNewDraftFromSource(
    bp: Blueprint,
    source: BlueprintVersion,
    versionNumber: number,
    _orgId: string,
  ) {
    const ver = this.em.create(BlueprintVersion, {
      blueprint: bp,
      versionNumber,
      isDraft: true,
      changelog: '',
    } as any);
    await this.em.persistAndFlush(ver);
    await this.cloneVersionStructure(source, ver);
    return ver;
  }

  async patchTenantBlueprint(
    id: string,
    organizationId: string,
    body: { name?: string; description?: string | null; isActive?: boolean },
  ) {
    const bp = await this.getOne(id, organizationId);
    if (bp.scope === BlueprintScope.SYSTEM) throw new BadRequestException('Cannot modify system blueprints here');
    if (body.name !== undefined) bp.name = body.name;
    if (body.description !== undefined) bp.description = body.description ?? undefined;
    if (body.isActive !== undefined) bp.isActive = body.isActive;
    await this.em.flush();
    return bp;
  }

  /**
   * Creates a new **draft** version, cloning the current version (or the parent system if none).
   */
  async createDraftVersion(
    blueprintId: string,
    organizationId: string,
    _userId: string,
    _changelog = '',
  ) {
    const bp = await this.getOne(blueprintId, organizationId);
    if (bp.scope !== BlueprintScope.TENANT) throw new BadRequestException('Draft versions are for tenant blueprints only');
    const hasDraft = await this.em.findOne(BlueprintVersion, { blueprint: { id: bp.id }, isDraft: true });
    if (hasDraft) throw new BadRequestException('A draft version already exists; publish or discard it first');
    const versions = await this.em.find(BlueprintVersion, { blueprint: { id: bp.id } });
    const nextNum = versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) + 1 : 1;
    let sourceId = bp.currentVersion ? (bp.currentVersion as { id: string }).id : null;
    if (!sourceId) {
      const parent = await this.em.findOne(Blueprint, { id: (bp.parentBlueprint as { id: string } | undefined)?.id }, { populate: ['currentVersion'] });
      sourceId = parent?.currentVersion ? (parent.currentVersion as { id: string }).id : null;
    }
    if (!sourceId) throw new BadRequestException('No source version to copy from');
    const source = await this.loadVersionForClone(sourceId);
    return this.createNewDraftFromSource(bp, source, nextNum, organizationId);
  }

  async publishVersion(
    blueprintId: string,
    versionNumber: number,
    organizationId: string,
    userId: string,
  ) {
    const bp = await this.getOne(blueprintId, organizationId);
    if (bp.scope !== BlueprintScope.TENANT) throw new BadRequestException();
    const ver = await this.em.findOne(BlueprintVersion, {
      blueprint: { id: bp.id },
      versionNumber,
      isDraft: true,
    });
    if (!ver) throw new NotFoundException('Draft version not found');
    await this.validateVersionStructure(ver);
    ver.isDraft = false;
    ver.publishedAt = new Date();
    ver.publishedBy = this.em.getReference(User, userId);
    bp.currentVersion = ver;
    await this.em.flush();
    return ver;
  }

  /** Structural checks before publish. */
  private async validateVersionStructure(version: BlueprintVersion) {
    await this.em.populate(version, ['stageTemplates']);
    const seen = new Set<string>();
    for (const st of version.stageTemplates) {
      if (seen.has(st.code)) {
        throw new BadRequestException(`Duplicate stage code: ${st.code}`);
      }
      seen.add(st.code);
    }
  }

  private async cloneVersionStructure(source: BlueprintVersion, target: BlueprintVersion) {
    await this.em.populate(source, ['stageTemplates.activities', 'stageTemplates.documentSuggestions', 'deadlineRules', 'sinoeKeywordRules']);
    for (const dr of source.deadlineRules.getItems() ?? []) {
      this.em.create(DeadlineRule, {
        blueprintVersion: target,
        code: dr.code,
        name: dr.name,
        trigger: dr.trigger,
        triggerTargetCode: dr.triggerTargetCode,
        durationDays: dr.durationDays,
        durationUnit: dr.durationUnit,
        legalReference: dr.legalReference,
        onExpiry: dr.onExpiry,
        criticality: dr.criticality,
      } as any);
    }
    for (const sk of source.sinoeKeywordRules.getItems() ?? []) {
      this.em.create(SinoeKeywordRule, {
        blueprintVersion: target,
        code: sk.code,
        pattern: sk.pattern,
        matchMode: sk.matchMode,
        action: sk.action,
        actionTargetCode: sk.actionTargetCode,
        confidenceScore: sk.confidenceScore,
        requiresApproval: sk.requiresApproval,
        criticality: sk.criticality,
      } as any);
    }
    const stages = (source.stageTemplates.getItems() ?? []).slice().sort((a, b) => a.order - b.order);
    for (const st of stages) {
      const nst = this.em.create(StageTemplate, {
        blueprintVersion: target,
        code: st.code,
        name: st.name,
        order: st.order,
        description: st.description,
        entryConditions: st.entryConditions,
        exitConditions: st.exitConditions,
        estimatedDurationDays: st.estimatedDurationDays,
        sinoeKeywords: st.sinoeKeywords,
        isOptional: st.isOptional,
        isParallelizable: st.isParallelizable,
      } as any);
      await this.em.persist(nst);
      for (const a of (st.activities.getItems() ?? []).slice().sort((x, y) => x.order - y.order)) {
        this.em.create(ActivityTemplate, {
          stageTemplate: nst,
          code: a.code,
          name: a.name,
          order: a.order,
          description: a.description,
          estimatedDurationMinutes: a.estimatedDurationMinutes,
          isMandatory: a.isMandatory,
          requiresDocument: a.requiresDocument,
          suggestedDocumentType: a.suggestedDocumentType,
          triggersDeadlineCode: a.triggersDeadlineCode,
        } as any);
      }
      for (const d of (st.documentSuggestions.getItems() ?? []).slice().sort((x, y) => x.order - y.order)) {
        this.em.create(DocumentSuggestion, {
          stageTemplate: nst,
          code: d.code,
          documentType: d.documentType ?? BlueprintDocumentType.OTRO,
          name: d.name,
          description: d.description,
          isRequired: d.isRequired,
          order: d.order,
        } as any);
      }
    }
    await this.em.flush();
  }
}
