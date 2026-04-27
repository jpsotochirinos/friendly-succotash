import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  Trackable,
  WorkflowState,
  WorkflowDefinition,
  WorkflowTransition,
  WorkflowItem,
  LegalDeadline,
  LegalProcessStageLog,
  SinoeNotification,
  CourtClosure,
} from '@tracker/db';
import { LegalProcessController } from './legal-process.controller';
import { LegalDeadlineCalculatorService } from './services/legal-deadline-calculator.service';
import { LegalDeadlineService } from './services/legal-deadline.service';
import { LegalProcessTemplateService } from './services/legal-process-template.service';
import { LegalProcessAdvanceService } from './services/legal-process-advance.service';
import { LegalProcessSinoeMatcherService } from './services/legal-process-sinoe-matcher.service';
import { SinoeMatchWorkerService } from './sinoe-match-worker.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Trackable,
      WorkflowState,
      WorkflowDefinition,
      WorkflowTransition,
      WorkflowItem,
      LegalDeadline,
      LegalProcessStageLog,
      SinoeNotification,
      CourtClosure,
    ]),
  ],
  controllers: [LegalProcessController],
  providers: [
    LegalDeadlineCalculatorService,
    LegalDeadlineService,
    LegalProcessTemplateService,
    LegalProcessAdvanceService,
    LegalProcessSinoeMatcherService,
    ...(process.env.ENABLE_LEGACY_SINOE_CONSUMER === 'true'
      ? [SinoeMatchWorkerService]
      : []),
  ],
  exports: [
    LegalProcessAdvanceService,
    LegalProcessSinoeMatcherService,
    LegalDeadlineService,
    LegalDeadlineCalculatorService,
  ],
})
export class LegalProcessModule {}
