import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { SinoeProposalsService } from './sinoe-proposals.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SinoeProposalStatus } from '@tracker/shared';

@Controller('sinoe-proposals')
export class SinoeProposalsController {
  constructor(private readonly sinoe: SinoeProposalsService) {}

  @Get()
  @RequirePermissions('trackable:read')
  async list(
    @CurrentUser() user: { organizationId: string | null },
    @Query('status') status?: SinoeProposalStatus,
    @Query('processTrackId') processTrackId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sinoe.list(user.organizationId!, { status, processTrackId, limit: limit ? Number(limit) : undefined });
  }

  @Get('stats')
  @RequirePermissions('trackable:read')
  async stats(@CurrentUser() user: { organizationId: string | null }) {
    return this.sinoe.stats(user.organizationId!);
  }

  @Get(':id')
  @RequirePermissions('trackable:read')
  async get(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.sinoe.getOne(id, user.organizationId!);
  }

  @Post(':id/approve')
  @RequirePermissions('sinoe-proposal:approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.sinoe.approve(id, user.organizationId!, user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('sinoe-proposal:approve')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.sinoe.reject(id, user.organizationId!, user.id, body.reason);
  }

  @Post(':id/revert')
  @RequirePermissions('sinoe-proposal:approve')
  async revert(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.sinoe.revert(id, user.organizationId!, user.id);
  }
}
