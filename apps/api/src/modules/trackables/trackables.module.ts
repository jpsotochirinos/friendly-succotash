import { Module } from '@nestjs/common';
import { TrackablesController } from './trackables.controller';
import { TrackablesService } from './trackables.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { ProcessTracksModule } from '../process-tracks/process-tracks.module';

@Module({
  imports: [WorkflowModule, ProcessTracksModule],
  controllers: [TrackablesController],
  providers: [TrackablesService],
  exports: [TrackablesService],
})
export class TrackablesModule {}
