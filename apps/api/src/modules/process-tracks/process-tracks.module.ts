import { Module, forwardRef } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  ProcessTrack,
  ProcessTrackEvent,
  StageInstance,
  ActivityInstance,
  ActivityInstanceComment,
  ComputedDeadline,
  Blueprint,
  User,
} from '@tracker/db';
import { ProcessTracksService } from './process-tracks.service';
import { ProcessTracksController } from './process-tracks.controller';
import { DeadlineEngineService } from './deadline-engine.service';
import { BlueprintsModule } from '../blueprints/blueprints.module';
import { LegalProcessModule } from '../legal/legal-process.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      ProcessTrack,
      ProcessTrackEvent,
      StageInstance,
      ActivityInstance,
      ActivityInstanceComment,
      ComputedDeadline,
      Blueprint,
      User,
    ]),
    forwardRef(() => BlueprintsModule),
    LegalProcessModule,
  ],
  providers: [ProcessTracksService, DeadlineEngineService],
  controllers: [ProcessTracksController],
  exports: [ProcessTracksService, DeadlineEngineService],
})
export class ProcessTracksModule {}
