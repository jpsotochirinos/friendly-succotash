import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { InvitationsService } from './invitations.service';
import { Public } from '../auth/decorators/public.decorator';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@Controller('auth/invitations')
export class InvitationsPublicController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Public()
  @Get('preview')
  async preview(@Query('token') token: string) {
    return this.invitationsService.preview(token ?? '');
  }

  @Public()
  @Post('accept')
  async accept(
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.invitationsService.accept(dto);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return result;
  }
}
