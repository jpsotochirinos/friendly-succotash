import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvents } from '@tracker/shared';
import { RuleEngineService, type DocumentDomainPayload } from './rule-engine.service';

@Injectable()
export class WorkflowDomainEventsListener {
  constructor(private readonly engine: RuleEngineService) {}

  @OnEvent(DomainEvents.DOCUMENT_CREATED)
  async onDocumentCreated(payload: DocumentDomainPayload) {
    await this.engine.dispatch(DomainEvents.DOCUMENT_CREATED, payload);
  }

  @OnEvent(DomainEvents.DOCUMENT_UPDATED)
  async onDocumentUpdated(payload: DocumentDomainPayload) {
    await this.engine.dispatch(DomainEvents.DOCUMENT_UPDATED, payload);
  }

  @OnEvent(DomainEvents.DOCUMENT_UPLOADED)
  async onDocumentUploaded(payload: DocumentDomainPayload) {
    await this.engine.dispatch(DomainEvents.DOCUMENT_UPLOADED, payload);
  }

  @OnEvent(DomainEvents.DOCUMENT_SUBMITTED)
  async onDocumentSubmitted(payload: DocumentDomainPayload) {
    await this.engine.dispatch(DomainEvents.DOCUMENT_SUBMITTED, payload);
  }

  @OnEvent(DomainEvents.DOCUMENT_APPROVED)
  async onDocumentApproved(payload: DocumentDomainPayload) {
    await this.engine.dispatch(DomainEvents.DOCUMENT_APPROVED, payload);
  }

  @OnEvent(DomainEvents.DOCUMENT_REJECTED)
  async onDocumentRejected(payload: DocumentDomainPayload) {
    await this.engine.dispatch(DomainEvents.DOCUMENT_REJECTED, payload);
  }

  @OnEvent(DomainEvents.TIME_HOURLY_TICK)
  async onHourlyTick(payload: Record<string, unknown>) {
    /* Phase 4: evaluated by dedicated handler or extended engine */
    void payload;
  }

  @OnEvent(DomainEvents.SINOE_NOTIFICATION_RECEIVED)
  async onSinoeNotification(payload: Record<string, unknown>) {
    void payload;
  }
}
