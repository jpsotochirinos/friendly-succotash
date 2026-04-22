import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { TrackablesModule } from './modules/trackables/trackables.module';
import { WorkflowItemsModule } from './modules/workflow-items/workflow-items.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { StorageModule } from './modules/storage/storage.module';
import { FoldersModule } from './modules/folders/folders.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SearchModule } from './modules/search/search.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RolesModule } from './modules/roles/roles.module';
import { WorkflowTemplatesModule } from './modules/workflow-templates/workflow-templates.module';
import { ClientsModule } from './modules/clients/clients.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { LlmModule } from './modules/llm/llm.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { SinoeModule } from './modules/sinoe/sinoe.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { RulesModule } from './modules/rules/rules.module';
import { ImportModule } from './modules/import/import.module';
import { MigrationModule } from './modules/migration/migration.module';
import { BillingModule } from './modules/billing/billing.module';
import { WorkflowDefinitionsModule } from './modules/workflow-definitions/workflow-definitions.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { FeedModule } from './modules/feed/feed.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { ActivityLogInterceptor } from './common/interceptors/activity-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    MikroOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        driver: PostgreSqlDriver,
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get('DATABASE_PORT', 5432),
        dbName: config.get('DATABASE_NAME', 'tracker_db'),
        user: config.get('DATABASE_USER', 'tracker_user'),
        password: config.get('DATABASE_PASSWORD', 'tracker_pass'),
        entities: ['../../packages/db/dist/entities/**/*.js'],
        entitiesTs: ['../../packages/db/src/entities/**/*.ts'],
        metadataProvider: TsMorphMetadataProvider,
        // TsMorph file cache (default ./temp/*.json) does not invalidate when entity columns change; stale cache produced invalid SELECTs after migrations (e.g. dropped workflow_items.status).
        metadataCache: { enabled: config.get('NODE_ENV') !== 'development' },
        debug: config.get('NODE_ENV') === 'development',
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ global: true, wildcard: false }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    WorkflowModule,
    TrackablesModule,
    ClientsModule,
    WorkflowItemsModule,
    UsersModule,
    NotificationsModule,
    ActivityLogModule,
    StorageModule,
    FoldersModule,
    DocumentsModule,
    DashboardModule,
    SearchModule,
    ScrapingModule,
    OrganizationsModule,
    RolesModule,
    WorkflowTemplatesModule,
    InvitationsModule,
    LlmModule,
    AssistantModule,
    SinoeModule,
    CalendarModule,
    RulesModule,
    ImportModule,
    MigrationModule,
    BillingModule,
    WorkflowDefinitionsModule,
    WhatsAppModule,
    FeedModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
  ],
})
export class AppModule {}
