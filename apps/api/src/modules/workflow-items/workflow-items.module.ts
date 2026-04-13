import { Module } from '@nestjs/common';
import { WorkflowItemsController } from './workflow-items.controller';
import { WorkflowItemsService } from './workflow-items.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  controllers: [WorkflowItemsController],
  providers: [WorkflowItemsService],
  exports: [WorkflowItemsService],
})
export class WorkflowItemsModule {}
