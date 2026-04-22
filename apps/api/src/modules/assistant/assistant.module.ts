import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantThreadsService } from './assistant-threads.service';
import { AssistantThreadsCleanupScheduler } from './assistant-threads-cleanup.scheduler';
import { AssistantAttachmentsService } from './assistant-attachments.service';
import { AssistantSearchService } from './assistant-search.service';
import { LlmModule } from '../llm/llm.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { TrackablesModule } from '../trackables/trackables.module';
import { WorkflowItemsModule } from '../workflow-items/workflow-items.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { DocumentsModule } from '../documents/documents.module';
import { FoldersModule } from '../folders/folders.module';
import { SearchModule } from '../search/search.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ClientsModule } from '../clients/clients.module';
import { UsersService } from '../users/users.service';
import { ClientsService } from '../clients/clients.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { TrackablesService } from '../trackables/trackables.service';
import { WorkflowItemsService } from '../workflow-items/workflow-items.service';
import { WorkflowService } from '../workflow/workflow.service';
import { DocumentsService } from '../documents/documents.service';
import { FoldersService } from '../folders/folders.service';
import { SearchService } from '../search/search.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LlmService } from '../llm/llm.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WhatsAppNotificationService } from '../whatsapp/services/whatsapp-notification.service';
import { WhatsAppMediaTokenService } from '../whatsapp/services/whatsapp-media-token.service';
@Module({
  imports: [
    ConfigModule,
    LlmModule,
    DashboardModule,
    TrackablesModule,
    WorkflowItemsModule,
    WorkflowModule,
    DocumentsModule,
    FoldersModule,
    SearchModule,
    NotificationsModule,
    UsersModule,
    ClientsModule,
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [AssistantController],
  providers: [
    AssistantThreadsService,
    AssistantThreadsCleanupScheduler,
    AssistantAttachmentsService,
    AssistantSearchService,
    {
      provide: AssistantService,
      useFactory: (
        llm: LlmService,
        config: ConfigService,
        dashboard: DashboardService,
        trackables: TrackablesService,
        workflowItems: WorkflowItemsService,
        workflow: WorkflowService,
        documents: DocumentsService,
        folders: FoldersService,
        search: SearchService,
        notifications: NotificationsService,
        users: UsersService,
        clients: ClientsService,
        threads: AssistantThreadsService,
        assistantAttachments: AssistantAttachmentsService,
        whatsappNotify: WhatsAppNotificationService,
        whatsappMediaToken: WhatsAppMediaTokenService,
        em: EntityManager,
      ) =>
        new AssistantService(
          llm,
          config,
          {
            config,
            dashboard,
            clients,
            trackables,
            workflowItems,
            workflow,
            documents,
            folders,
            search,
            notifications,
            llm,
            users,
            assistantAttachments,
            whatsappNotify,
            whatsappMediaToken,
          },
          threads,
          em,
        ),
      inject: [
        LlmService,
        ConfigService,
        DashboardService,
        TrackablesService,
        WorkflowItemsService,
        WorkflowService,
        DocumentsService,
        FoldersService,
        SearchService,
        NotificationsService,
        UsersService,
        ClientsService,
        AssistantThreadsService,
        AssistantAttachmentsService,
        WhatsAppNotificationService,
        WhatsAppMediaTokenService,
        EntityManager,
      ],
    },
  ],
  exports: [AssistantService, AssistantThreadsService, AssistantAttachmentsService],
})
export class AssistantModule {}
