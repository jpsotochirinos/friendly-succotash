import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowAssignmentService } from './workflow-assignment.service';
import { WorkflowGateway } from './workflow.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [WorkflowEngineService, WorkflowAssignmentService, WorkflowService, WorkflowGateway],
  exports: [WorkflowService, WorkflowEngineService, WorkflowAssignmentService],
})
export class WorkflowModule {}
