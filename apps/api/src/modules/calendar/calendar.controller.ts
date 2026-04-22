import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Query,
  Param,
  Body,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequireAnyPermission, RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CalendarService } from './calendar.service';
import { CalendarIntegrationService } from './calendar-integration.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { RescheduleEventDto } from './dto/reschedule-event.dto';
import { PatchProfileBirthDateDto } from './dto/patch-profile.dto';

@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly calendar: CalendarService,
    private readonly integrations: CalendarIntegrationService,
  ) {}

  @Get('events')
  @RequireAnyPermission('calendar:read', 'trackable:read')
  async listEvents(
    @Query() q: CalendarQueryDto,
    @CurrentUser() user: { id: string; organizationId: string; permissions: string[] },
  ) {
    return this.calendar.listEvents(user.organizationId, user.id, user.permissions, q);
  }

  @Patch('profile/birth-date')
  @RequireAnyPermission('calendar:read', 'trackable:read')
  async patchBirthDate(
    @Body() dto: PatchProfileBirthDateDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.calendar.updateBirthDate(user.id, user.organizationId, dto.birthDate);
  }

  @Patch('events/:workflowItemId/reschedule')
  @RequirePermissions('workflow_item:update')
  async reschedule(
    @Param('workflowItemId') workflowItemId: string,
    @Body() dto: RescheduleEventDto,
    @CurrentUser() user: { organizationId: string; permissions: string[] },
  ) {
    return this.calendar.reschedule(user.organizationId, workflowItemId, dto, user.permissions);
  }

  @Get('feed/regenerate')
  @RequireAnyPermission('calendar:read', 'trackable:read')
  async regenerateFeedToken(@CurrentUser() user: { id: string; organizationId: string }) {
    const token = await this.calendar.ensureIcsToken(user.id, user.organizationId);
    const apiBase = process.env.API_PUBLIC_URL || `http://localhost:${process.env.APP_PORT || 3000}`;
    return {
      token,
      url: `${apiBase.replace(/\/$/, '')}/api/calendar/feed/${token}.ics`,
    };
  }

  @Public()
  @Get('feed/:token')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async icsFeed(@Param('token') token: string, @Res() res: Response) {
    const t = token.replace(/\.ics$/, '');
    const ctx = await this.calendar.validateIcsToken(t);
    if (!ctx) {
      return res.status(404).send('Not found');
    }
    const from = new Date();
    const to = new Date(from.getTime() + 90 * 86400000);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const { events } = await this.calendar.listEvents(ctx.organizationId, ctx.userId, ['trackable:read'], {
      from: fromStr,
      to: toStr,
      scope: 'mine',
      includeBirthdays: true,
      includeExternal: true,
    } as any);
    const body = this.calendar.buildIcsCalendar(events, 'Alega');
    return res.send(body);
  }

  @Get('integrations/google/authorize')
  @RequirePermissions('calendar:integration:manage')
  getGoogleAuthorize(@CurrentUser() user: { id: string; organizationId: string }) {
    const url = this.integrations.getGoogleOAuthUrl(user.id, user.organizationId);
    return { url };
  }

  @Public()
  @Get('integrations/google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) throw new BadRequestException('Missing code or state');
    await this.integrations.handleGoogleCallback(code, state);
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontend}/settings/calendar?connected=google`);
  }

  @Post('integrations/google/sync')
  @RequirePermissions('calendar:integration:manage')
  async syncGoogle(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.integrations.syncGoogleCalendar(user.id, user.organizationId, from, to);
  }

  @Get('integrations/outlook/authorize')
  @RequirePermissions('calendar:integration:manage')
  getOutlookAuthorize(@CurrentUser() user: { id: string; organizationId: string }) {
    const url = this.integrations.getOutlookOAuthUrl(user.id, user.organizationId);
    return { url };
  }

  @Public()
  @Get('integrations/outlook/callback')
  async outlookCallback(@Res() res: Response) {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontend}/settings/calendar?error=outlook_not_configured`);
  }
}
