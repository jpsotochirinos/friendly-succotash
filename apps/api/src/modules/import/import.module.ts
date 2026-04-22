import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportOAuthService } from './import-oauth.service';
import { ImportMsGraphService } from './import-ms-graph.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ImportController],
  providers: [ImportService, ImportOAuthService, ImportMsGraphService],
  exports: [ImportService, ImportOAuthService, ImportMsGraphService],
})
export class ImportModule {}
