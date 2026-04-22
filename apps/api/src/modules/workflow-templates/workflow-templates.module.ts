import { Module } from '@nestjs/common';
import { WorkflowTemplatesController } from './workflow-templates.controller';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  controllers: [WorkflowTemplatesController],
  providers: [WorkflowTemplatesService],
  exports: [WorkflowTemplatesService],
})
export class WorkflowTemplatesModule {}
