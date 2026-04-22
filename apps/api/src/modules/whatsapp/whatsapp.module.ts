import { Module, forwardRef } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  WhatsAppAccount,
  WhatsAppActivitySuggestion,
  WhatsAppEventOptIn,
  WhatsAppMessage,
  WhatsAppUser,
} from '@tracker/db';
import { AssistantModule } from '../assistant/assistant.module';
import { DocumentsModule } from '../documents/documents.module';
import { WorkflowItemsModule } from '../workflow-items/workflow-items.module';
import { WhatsAppPermissionGuard } from './guards/whatsapp-permission.guard';
import { Dialog360Provider } from './providers/dialog360.provider';
import { MetaProvider } from './providers/meta.provider';
import { TwilioProvider } from './providers/twilio.provider';
import { WHATSAPP_PROVIDER } from './providers/whatsapp-provider.interface';
import { WhatsAppActivityDetectorService } from './services/whatsapp-activity-detector.service';
import { WhatsAppBriefingService } from './services/whatsapp-briefing.service';
import { WhatsAppInboundService } from './services/whatsapp-inbound.service';
import { WhatsAppMessageService } from './services/whatsapp-message.service';
import { WhatsAppNotificationService } from './services/whatsapp-notification.service';
import { WhatsAppPermissionService } from './services/whatsapp-permission.service';
import { WhatsAppNotificationDispatcher } from './services/whatsapp-notification-dispatcher.service';
import { WhatsAppNotificationListener } from './whatsapp-notification.listener';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppMediaController } from './whatsapp-media.controller';
import { WhatsAppMediaTokenService } from './services/whatsapp-media-token.service';

@Module({
  imports: [
    ConfigModule,
    MikroOrmModule.forFeature([
      WhatsAppAccount,
      WhatsAppUser,
      WhatsAppMessage,
      WhatsAppActivitySuggestion,
      WhatsAppEventOptIn,
    ]),
    forwardRef(() => AssistantModule),
    DocumentsModule,
    WorkflowItemsModule,
  ],
  controllers: [WhatsAppController, WhatsAppMediaController],
  providers: [
    TwilioProvider,
    Dialog360Provider,
    MetaProvider,
    {
      provide: WHATSAPP_PROVIDER,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const p = cfg.get<string>('WHATSAPP_PROVIDER') || 'twilio';
        if (p === 'dialog360') return new Dialog360Provider(cfg);
        if (p === 'meta') return new MetaProvider(cfg);
        return new TwilioProvider(cfg);
      },
    },
    WhatsAppMessageService,
    WhatsAppNotificationService,
    WhatsAppBriefingService,
    WhatsAppActivityDetectorService,
    WhatsAppPermissionService,
    WhatsAppInboundService,
    WhatsAppPermissionGuard,
    WhatsAppNotificationDispatcher,
    WhatsAppNotificationListener,
    WhatsAppMediaTokenService,
  ],
  exports: [
    WhatsAppNotificationService,
    WhatsAppMediaTokenService,
    WhatsAppBriefingService,
    WhatsAppMessageService,
    WhatsAppActivityDetectorService,
    WhatsAppNotificationDispatcher,
  ],
})
export class WhatsAppModule {}
