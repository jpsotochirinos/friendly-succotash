import { Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/workflow.module';
import { CodeDefaultsRegistry } from './code-defaults-registry.service';
import { RuleResolverService } from './rule-resolver.service';
import { RuleEngineService } from './rule-engine.service';
import { WorkflowDomainEventsListener } from './workflow-domain-events.listener';

@Module({
  imports: [WorkflowModule],
  controllers: [],
  providers: [
    CodeDefaultsRegistry,
    RuleResolverService,
    RuleEngineService,
    WorkflowDomainEventsListener,
  ],
  exports: [RuleEngineService, RuleResolverService],
})
export class RulesModule {}
