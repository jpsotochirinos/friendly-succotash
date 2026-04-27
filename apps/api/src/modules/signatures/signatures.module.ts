import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  SignatureEvent,
  SignatureOtp,
  SignatureProfile,
  SignatureRequest,
  SignatureRequestSigner,
} from '@tracker/db';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SignatureController } from './signature.controller';
import { SignaturePublicController } from './signature-public.controller';
import { SignatureAuditService } from './services/signature-audit.service';
import { SignatureOtpService } from './services/signature-otp.service';
import { SignaturePdfService } from './services/signature-pdf.service';
import { SignatureProfileService } from './services/signature-profile.service';
import { SignatureRequestService } from './services/signature-request.service';
import { SignatureTsaService } from './services/signature-tsa.service';
import { SignatureTokenService } from './services/signature-token.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      SignatureProfile,
      SignatureRequest,
      SignatureRequestSigner,
      SignatureEvent,
      SignatureOtp,
    ]),
    StorageModule,
    NotificationsModule,
    WhatsAppModule,
  ],
  controllers: [SignatureController, SignaturePublicController],
  providers: [
    SignatureTokenService,
    SignatureAuditService,
    SignatureProfileService,
    SignatureOtpService,
    SignaturePdfService,
    SignatureTsaService,
    SignatureRequestService,
  ],
  exports: [SignatureRequestService, SignatureProfileService, SignaturePdfService],
})
export class SignaturesModule {}
