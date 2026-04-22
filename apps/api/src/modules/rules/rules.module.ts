import { Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/workflow.module';
import { CodeDefaultsRegistry } from './code-defaults-registry.service';
import { RuleResolverService } from './rule-resolver.service';
import { RuleEngineService } from './rule-engine.service';
import { WorkflowDomainEventsListener } from './workflow-domain-events.listener';
import { RulesController } from './rules.controller';
import { WorkflowRulesAdminService } from './workflow-rules-admin.service';

@Module({
  imports: [WorkflowModule],
  controllers: [RulesController],
  providers: [
    CodeDefaultsRegistry,
    RuleResolverService,
    RuleEngineService,
    WorkflowDomainEventsListener,
    WorkflowRulesAdminService,
  ],
  exports: [RuleEngineService, RuleResolverService, WorkflowRulesAdminService],
})
export class RulesModule {}
