import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { ExternalDeclineBodyDto, ExternalOtpBodyDto, ExternalSignBodyDto } from './dto/external-signature.dto';
import { SignatureRequestService } from './services/signature-request.service';

@Controller('signatures/public')
export class SignaturePublicController {
  constructor(private readonly requests: SignatureRequestService) {}

  @Public()
  @Get('verify/:hash')
  async verify(@Param('hash') hash: string) {
    return this.requests.verifyByHash(hash);
  }

  @Public()
  @Get('verify-req/:id')
  async verifyByRequest(@Param('id') id: string) {
    return this.requests.verifyByRequestId(id);
  }

  @Public()
  @Get('external/preview')
  async preview(@Query('token') token: string) {
    if (!token) return { valid: false, reason: 'missing_token' };
    return this.requests.getExternalPreview(token);
  }

  @Public()
  @Get('external/pdf-url')
  async externalPdfUrl(@Query('token') token: string) {
    if (!token) {
      return { url: null, error: 'missing_token' as const };
    }
    return this.requests.getExternalSignPdfUrl(token);
  }

  @Public()
  @Post('external/otp')
  async sendOtp(@Body() body: ExternalOtpBodyDto, @Req() req: Request) {
    return this.requests.sendOtpExternal(body.token, req, { channel: body.channel, phone: body.phone });
  }

  @Public()
  @Post('external/sign')
  async sign(@Body() body: ExternalSignBodyDto, @Req() req: Request) {
    return this.requests.processExternalSign(
      body.token,
      body.otpCode,
      req,
      body.signatureDataUrl,
      body.signatureZone,
    );
  }

  @Public()
  @Post('external/decline')
  async decline(@Body() body: ExternalDeclineBodyDto, @Req() req: Request) {
    return this.requests.declineExternal(body.token, body.reason, req);
  }
}
