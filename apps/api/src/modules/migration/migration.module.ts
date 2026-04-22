import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MigrationController } from './migration.controller';
import { MigrationSseAuthGuard } from './migration-sse.guard';
import { MigrationService } from './migration.service';

/** LlmModule is @Global() — LlmService is available here without importing LlmModule. */

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [MigrationController],
  providers: [MigrationService, MigrationSseAuthGuard],
  exports: [MigrationService],
})
export class MigrationModule {}
