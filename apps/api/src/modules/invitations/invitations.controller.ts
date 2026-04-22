import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('role-options')
  @RequirePermissions('user:create')
  async roleOptions(@CurrentUser('organizationId') organizationId: string) {
    return this.invitationsService.getRoleOptions(organizationId);
  }

  @Get()
  @RequirePermissions('user:read')
  async list(@CurrentUser('organizationId') organizationId: string) {
    return this.invitationsService.findAllPending(organizationId);
  }

  @Post()
  @RequirePermissions('user:create')
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invitationsService.create(dto, organizationId, userId);
  }

  @Post(':id/send-email')
  @RequirePermissions('user:create')
  async sendEmail(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.invitationsService.sendEmail(id, organizationId);
  }

  @Delete(':id')
  @RequirePermissions('user:create')
  async revoke(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    await this.invitationsService.revoke(id, organizationId);
    return { ok: true };
  }
}
