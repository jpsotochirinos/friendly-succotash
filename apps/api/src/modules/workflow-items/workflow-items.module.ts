import { Module } from '@nestjs/common';
import { WorkflowItemsController } from './workflow-items.controller';
import { WorkflowItemsService } from './workflow-items.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { DocumentsModule } from '../documents/documents.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [WorkflowModule, DocumentsModule, FoldersModule],
  controllers: [WorkflowItemsController],
  providers: [WorkflowItemsService],
  exports: [WorkflowItemsService],
})
export class WorkflowItemsModule {}
