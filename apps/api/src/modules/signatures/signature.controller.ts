import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAnyPermission, RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CreateSignatureRequestDto } from './dto/create-signature-request.dto';
import { DeclineSignatureBodyDto, SendOtpDto } from './dto/decline-signature.dto';
import { SignSignatureBodyDto } from './dto/sign-signature.dto';
import { SignatureProfileService } from './services/signature-profile.service';
import { SignatureRequestService } from './services/signature-request.service';
import { SignatureOtpService } from './services/signature-otp.service';

@Controller('signatures')
export class SignatureController {
  constructor(
    private readonly profile: SignatureProfileService,
    private readonly requests: SignatureRequestService,
    private readonly otp: SignatureOtpService,
  ) {}

  @Post('profile/upload')
  @RequirePermissions('signature:sign')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async uploadProfile(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('file required');
    return this.profile.uploadSignature(organizationId, userId, file);
  }

  @Get('profile/me')
  @RequirePermissions('signature:sign')
  async myProfile(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.profile.getMyProfileForClient(organizationId, userId);
  }

  @Delete('profile/me')
  @RequirePermissions('signature:sign')
  async deleteMy(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.profile.deleteMyProfile(organizationId, userId);
    return { ok: true };
  }

  @Get('profile/:userId')
  @RequirePermissions('signature:manage_profiles')
  async teamProfile(
    @Param('userId') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('permissions') permissions: string[],
  ) {
    return this.profile.getByUserId(organizationId, userId, permissions);
  }

  @Post('requests')
  @RequireAnyPermission('signature:create', 'signature:sign')
  async createRequest(
    @Body() dto: CreateSignatureRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('permissions') permissions: string[],
    @Req() req: Request,
  ) {
    return this.requests.create(dto, userId, organizationId, permissions, req);
  }

  @Get('requests')
  @RequirePermissions('signature:sign')
  async list(
    @Query('tab') tab: 'pending' | 'sent' | 'completed' | 'all' | undefined,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.requests.listForUser(organizationId, userId, tab || 'all');
  }

  @Get('requests/:id')
  @RequirePermissions('signature:sign')
  async getOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('permissions') permissions: string[],
  ) {
    return this.requests.getOne(id, organizationId, userId, permissions);
  }

  @Get('requests/:id/signed-url')
  @RequirePermissions('signature:sign')
  async signedUrl(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('permissions') permissions: string[],
  ) {
    const url = await this.requests.getSignedDocumentPresignedUrl(
      id,
      organizationId,
      userId,
      permissions,
    );
    return { url };
  }

  @Get('requests/:id/pdf-url')
  @RequirePermissions('signature:sign')
  async pdfUrl(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('permissions') permissions: string[],
  ) {
    return this.requests.getPdfPreviewPayload(id, organizationId, userId, permissions);
  }

  @Post('requests/:id/retry-conversion')
  @RequirePermissions('signature:sign')
  async retryConversion(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('permissions') permissions: string[],
  ) {
    return this.requests.retryConversion(id, organizationId, userId, permissions);
  }

  @Delete('requests/:id')
  @RequirePermissions('signature:sign')
  async cancel(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('permissions') permissions: string[],
  ) {
    await this.requests.cancel(id, organizationId, userId, permissions);
    return { ok: true };
  }

  @Post('requests/:id/sign')
  @RequirePermissions('signature:sign')
  async sign(
    @Param('id') id: string,
    @Body() body: SignSignatureBodyDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.requests.processSign(
      id,
      organizationId,
      userId,
      body.signerId,
      body.otpCode,
      req,
      body.signatureDataUrl,
      body.signatureZone,
    );
  }

  @Post('requests/:id/decline')
  @RequirePermissions('signature:sign')
  async decline(
    @Param('id') id: string,
    @Body() body: DeclineSignatureBodyDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.requests.decline(id, organizationId, userId, body.signerId, body.reason, req);
  }

  @Post('otp/send')
  @RequirePermissions('signature:sign')
  async sendOtp(
    @Body() body: SendOtpDto,
    @CurrentUser('organizationId') organizationId: string,
    @Req() req: Request,
  ) {
    return this.requests.sendOtpForSigner(body.signerId, organizationId, req, {
      channel: body.channel,
    });
  }
}
