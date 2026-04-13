import { Module } from '@nestjs/common';
import { TrackablesController } from './trackables.controller';
import { TrackablesService } from './trackables.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  controllers: [TrackablesController],
  providers: [TrackablesService],
  exports: [TrackablesService],
})
export class TrackablesModule {}
