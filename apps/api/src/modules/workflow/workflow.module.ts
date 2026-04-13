import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowGateway } from './workflow.gateway';

@Module({
  providers: [WorkflowService, WorkflowGateway],
  exports: [WorkflowService],
})
export class WorkflowModule {}
