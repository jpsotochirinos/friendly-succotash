import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ProcessTrack } from '@tracker/db';
import { BlueprintResolverService } from './blueprint-resolver.service';
import { BlueprintsService } from './blueprints.service';
import { resolvedTreeToJson } from '@tracker/shared';

@Controller('blueprints')
export class BlueprintsController {
  constructor(
    private readonly em: EntityManager,
    private readonly resolver: BlueprintResolverService,
    private readonly blueprints: BlueprintsService,
  ) {}

  @Get()
  @RequirePermissions('blueprint:read')
  async list(@CurrentUser() user: { organizationId: string | null }, @Query('matterType') matterType?: string) {
    return this.blueprints.listCatalog(user.organizationId!, matterType);
  }

  @Post('tenant')
  @RequirePermissions('blueprint:manage')
  async createTenant(
    @Body() dto: { systemBlueprintId: string; code: string; name: string },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.blueprints.createTenantBlueprint(
      user.organizationId!,
      dto.systemBlueprintId,
      dto.code,
      dto.name,
    );
  }

  @Get('resolved/:processTrackId')
  @RequirePermissions('blueprint:read')
  async getResolved(
    @Param('processTrackId') processTrackId: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    const pt = await this.em.findOne(
      ProcessTrack,
      { id: processTrackId, organization: { id: user.organizationId! } },
      { populate: ['trackable', 'blueprint', 'blueprint.parentBlueprint'] },
    );
    if (!pt) {
      throw new NotFoundException('Process track not found');
    }
    const tree = await this.resolver.resolveForProcessTrack(pt);
    return { ...resolvedTreeToJson(tree), sourceVersionIds: tree.sourceVersionIds };
  }

  @Patch(':id')
  @RequirePermissions('blueprint:manage')
  async patch(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string | null; isActive?: boolean },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.blueprints.patchTenantBlueprint(id, user.organizationId!, dto);
  }

  @Get(':id/resolved')
  @RequirePermissions('blueprint:read')
  async getTenantResolved(
    @Param('id') id: string,
    @Query('versionId') versionId: string | undefined,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    const tree = await this.resolver.resolveForBlueprintCatalog(id, user.organizationId!, {
      versionId,
    });
    return { ...resolvedTreeToJson(tree), sourceVersionIds: tree.sourceVersionIds };
  }

  @Post('adopt')
  @RequirePermissions('blueprint:manage')
  async adopt(
    @Body() dto: { systemBlueprintId: string; code: string; name: string },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.blueprints.adoptSystemBlueprint(
      user.organizationId!,
      dto.systemBlueprintId,
      dto.code,
      dto.name,
    );
  }

  @Get(':id/versions/:v1/diff/:v2')
  @RequirePermissions('blueprint:read')
  async diff(
    @Param('id') id: string,
    @Param('v1') v1: string,
    @Param('v2') v2: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.blueprints.diffVersions(id, Number(v1), Number(v2), user.organizationId!);
  }

  @Get(':id/versions')
  @RequirePermissions('blueprint:read')
  async versions(@Param('id') id: string, @CurrentUser() user: { organizationId: string | null }) {
    return this.blueprints.listVersions(id, user.organizationId!);
  }

  @Post(':id/versions')
  @RequirePermissions('blueprint:manage')
  async createDraft(
    @Param('id') id: string,
    @Body() dto: { changelog?: string } | undefined,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.blueprints.createDraftVersion(
      id,
      user.organizationId!,
      user.id,
      dto?.changelog,
    );
  }

  @Post(':id/versions/:versionNumber/publish')
  @RequirePermissions('blueprint:manage')
  async publish(
    @Param('id') id: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.blueprints.publishVersion(id, Number(versionNumber), user.organizationId!, user.id);
  }

  @Get(':id/overrides')
  @RequirePermissions('blueprint:read')
  async listOverrides(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.blueprints.listOverrides(id, user.organizationId!);
  }

  @Patch(':id/overrides/:overrideId')
  @RequirePermissions('blueprint:manage')
  async patchOverride(
    @Param('id') id: string,
    @Param('overrideId') overrideId: string,
    @Body() dto: { patch?: Record<string, unknown>; reason?: string },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.blueprints.updateOverride(id, overrideId, user.organizationId!, {
      patch: dto.patch,
      reason: dto.reason,
      userId: user.id,
    });
  }

  @Delete(':id/overrides/:overrideId')
  @RequirePermissions('blueprint:manage')
  async removeOverride(
    @Param('id') id: string,
    @Param('overrideId') overrideId: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.blueprints.deleteOverride(id, overrideId, user.organizationId!);
  }

  @Post(':id/overrides')
  @RequirePermissions('blueprint:manage')
  async createOverride(
    @Param('id') id: string,
    @Body() dto: { targetType: string; targetCode?: string; operation: string; patch: Record<string, unknown>; reason?: string },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.blueprints.createOverride(id, user.organizationId!, {
      targetType: dto.targetType as any,
      targetCode: dto.targetCode,
      operation: dto.operation as any,
      patch: dto.patch,
      reason: dto.reason,
      userId: user.id,
    });
  }

  @Get(':id')
  @RequirePermissions('blueprint:read')
  async getOne(@Param('id') id: string, @CurrentUser() user: { organizationId: string | null }) {
    return this.blueprints.getOne(id, user.organizationId!);
  }
}
