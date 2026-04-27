import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SinoeProposal } from '@tracker/db';
import { SinoeProposalsService } from './sinoe-proposals.service';
import { SinoeProposalsController } from './sinoe-proposals.controller';

@Module({
  imports: [MikroOrmModule.forFeature([SinoeProposal])],
  providers: [SinoeProposalsService],
  controllers: [SinoeProposalsController],
  exports: [SinoeProposalsService],
})
export class SinoeProposalsModule {}
