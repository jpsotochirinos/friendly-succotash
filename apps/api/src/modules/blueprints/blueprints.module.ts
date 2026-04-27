import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  Blueprint,
  BlueprintVersion,
  BlueprintOverride,
  ProcessTrack,
  BlueprintResolvedSnapshot,
  StageInstance,
} from '@tracker/db';
import { BlueprintResolverService } from './blueprint-resolver.service';
import { BlueprintsService } from './blueprints.service';
import { BlueprintsController } from './blueprints.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Blueprint,
      BlueprintVersion,
      BlueprintOverride,
      ProcessTrack,
      BlueprintResolvedSnapshot,
      StageInstance,
    ]),
  ],
  providers: [BlueprintResolverService, BlueprintsService],
  controllers: [BlueprintsController],
  exports: [BlueprintResolverService, BlueprintsService],
})
export class BlueprintsModule {}
