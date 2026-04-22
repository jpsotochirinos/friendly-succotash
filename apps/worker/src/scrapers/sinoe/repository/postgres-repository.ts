import type { EntityManager } from '@mikro-orm/postgresql';
import type { Client as MinioClient } from 'minio';
import {
  ActivityLog,
  Document,
  SinoeAttachment,
  SinoeNotification,
  Trackable,
  WorkflowItem,
} from '@tracker/db';
import { createNotificationEventWithRecipients } from '@tracker/db';
import {
  ActionType,
  DomainEvents,
  NOTIFICATION_TYPES,
  NOTIFICATION_RECIPIENT_ROLES,
  NOTIFICATION_SOURCE,
  SINOE_ASSIGNMENT_STATUS,
  type SinoeAnexoDownloaded,
  type SinoeScrapeRow,
} from '@tracker/shared';
import type { ScrapeResult } from '../../base-scraper';
import { allocateWorkflowItemNumbers } from '../workflow-item-number.util';
import { extensionFromMime } from '../attachments/attachment-downloader';
import type { PersistStats, SinoePersistContext } from './notification-repository';
import { sendPlainEmail } from '../../../utils/mailer';
import { normalizeExpediente } from '../expediente.util';

function stripBuffersForRaw(row: SinoeScrapeRow): Record<string, unknown> {
  const { anexos, ...rest } = row;
  return {
    ...rest,
    anexos: anexos.map((a: SinoeAnexoDownloaded) => {
      const { fileBuffer: _fb, ...m } = a;
      return m;
    }),
  };
}

function sinoeInboxMessage(
  status: string,
  row: SinoeScrapeRow,
  trackable: Trackable | null,
): string {
  if (status === SINOE_ASSIGNMENT_STATUS.NEEDS_EXPEDIENTE) {
    return `No hay expediente en Alega con el número ${row.nroExpediente}. Crea o vincula un expediente para asociar esta notificación PJ.`;
  }
  if (status === SINOE_ASSIGNMENT_STATUS.NEEDS_ASSIGNEE) {
    return `Notificación vinculada al expediente ${trackable?.title ?? row.nroExpediente}. Asigna un responsable al expediente para completar el flujo.`;
  }
  return `Nueva notificación SINOE en expediente ${trackable?.title ?? row.nroExpediente}.`;
}

export class SinoePostgresRepository {
  constructor(
    private readonly minio: MinioClient,
    private readonly bucket: string,
  ) {}

  /** Solo anexos nuevos (mismo binario = mismo sha256 → no duplicar MinIO ni filas). */
  private async persistMissingAnexos(
    em: EntityManager,
    ctx: SinoePersistContext,
    notif: SinoeNotification,
    row: SinoeScrapeRow,
    workflowItem: WorkflowItem | undefined,
  ): Promise<void> {
    const already = await em.find(SinoeAttachment, { notification: notif.id }, { filters: false });
    const existingShas = new Set(already.map((a) => a.sha256).filter(Boolean) as string[]);
    const prefix = `sinoe/org-${ctx.organizationId}/user-${ctx.userId}/${row.nroNotificacion}`;

    for (const ax of row.anexos) {
      if (!ax.fileBuffer?.length) continue;
      const crypto = await import('crypto');
      const sha = crypto.createHash('sha256').update(ax.fileBuffer).digest('hex');
      if (existingShas.has(sha)) continue;
      existingShas.add(sha);

      const att = em.create(SinoeAttachment, {
        organization: ctx.organizationId,
        notification: notif,
        tipo: ax.tipo,
        identificacionAnexo: ax.identificacionAnexo,
        nroPaginas: ax.nroPaginas,
        pesoArchivo: ax.pesoArchivo,
      } as any);

      const ext =
        ax.suggestedFilename?.split('.').pop() || extensionFromMime(undefined, 'pdf');
      const key = `${prefix}/${sha}.${ext}`;
      await this.minio.putObject(this.bucket, key, ax.fileBuffer, ax.fileBuffer.length, {
        'Content-Type': 'application/octet-stream',
      });
      att.sha256 = sha;
      att.sizeBytes = String(ax.fileBuffer.length);

      const doc = em.create(Document, {
        organization: ctx.organizationId,
        title: ax.suggestedFilename || `SINOE ${row.nroNotificacion}`,
        filename: ax.suggestedFilename || `${sha.slice(0, 12)}.${ext}`,
        mimeType: 'application/pdf',
        minioKey: key,
        uploadedBy: em.getReference('User', ctx.userId) as any,
        workflowItem: workflowItem ? workflowItem.id : undefined,
      } as any);
      att.document = doc;
      await em.flush();
    }
  }

  async persistScrapeRows(
    em: EntityManager,
    ctx: SinoePersistContext,
    result: ScrapeResult,
  ): Promise<PersistStats> {
    const byStatus: Record<string, number> = {};
    let newCount = 0;
    const rows = result.data as unknown as SinoeScrapeRow[];
    const totalCount = rows.length;

    for (const row of rows) {
      const estado = row.estadoRevision;
      byStatus[estado] = (byStatus[estado] || 0) + 1;

      const existing = await em.findOne(
        SinoeNotification,
        {
          organization: ctx.organizationId,
          nroNotificacion: row.nroNotificacion,
        },
        { filters: false, populate: ['workflowItem'] as const },
      );

      if (existing) {
        existing.rawData = stripBuffersForRaw(row) as Record<string, unknown>;
        existing.updatedAt = new Date();
        await em.flush();
        const wi = (existing.workflowItem as WorkflowItem | undefined) ?? undefined;
        await this.persistMissingAnexos(em, ctx, existing, row, wi);
        await em.flush();
        continue;
      }

      const notif = em.create(SinoeNotification, {
        organization: ctx.organizationId,
        nroNotificacion: row.nroNotificacion,
        nroExpediente: row.nroExpediente,
        sumilla: row.sumilla,
        organoJurisdiccional: row.organoJurisdiccional,
        fecha: row.fecha instanceof Date ? row.fecha : new Date(row.fecha),
        estadoRevision: row.estadoRevision,
        carpeta: row.carpeta,
        user: em.getReference('User', ctx.userId) as any,
        rawData: stripBuffersForRaw(row) as Record<string, unknown>,
      } as any);

      await em.flush();

      const exp = normalizeExpediente(row.nroExpediente);
      const trackable =
        exp && exp !== '—'
          ? await em.findOne(
              Trackable,
              {
                organization: ctx.organizationId,
                expedientNumber: exp,
              } as any,
              { filters: false, populate: ['assignedTo'] as const },
            )
          : null;

      let workflowItem: WorkflowItem | undefined;

      if (trackable) {
        const [itemNumber] = await allocateWorkflowItemNumbers(em, trackable.id, 1);
        workflowItem = em.create(WorkflowItem, {
          trackable: trackable.id,
          organization: ctx.organizationId,
          title: `SINOE: ${row.sumilla.slice(0, 120)}`,
          description: row.sumilla,
          kind: 'Diligencia',
          actionType: ActionType.EXTERNAL_CHECK,
          depth: 2,
          sortOrder: 0,
          itemNumber,
          metadata: {
            source: 'sinoe',
            sinoeNotificationId: notif.id,
            nroNotificacion: row.nroNotificacion,
          },
        } as any);
        notif.trackable = trackable;
        notif.workflowItem = workflowItem;
        notif.assignmentStatus = trackable.assignedTo?.id
          ? SINOE_ASSIGNMENT_STATUS.LINKED
          : SINOE_ASSIGNMENT_STATUS.NEEDS_ASSIGNEE;
      } else {
        notif.assignmentStatus = SINOE_ASSIGNMENT_STATUS.NEEDS_EXPEDIENTE;
      }

      await em.flush();

      const prefix = `sinoe/org-${ctx.organizationId}/user-${ctx.userId}/${row.nroNotificacion}`;

      for (const ax of row.anexos) {
        const att = em.create(SinoeAttachment, {
          organization: ctx.organizationId,
          notification: notif,
          tipo: ax.tipo,
          identificacionAnexo: ax.identificacionAnexo,
          nroPaginas: ax.nroPaginas,
          pesoArchivo: ax.pesoArchivo,
        } as any);

        if (ax.fileBuffer && ax.fileBuffer.length > 0) {
          const crypto = await import('crypto');
          const sha = crypto.createHash('sha256').update(ax.fileBuffer).digest('hex');
          const ext =
            ax.suggestedFilename?.split('.').pop() ||
            extensionFromMime(undefined, 'pdf');
          const key = `${prefix}/${sha}.${ext}`;
          await this.minio.putObject(this.bucket, key, ax.fileBuffer, ax.fileBuffer.length, {
            'Content-Type': 'application/octet-stream',
          });
          att.sha256 = sha;
          att.sizeBytes = String(ax.fileBuffer.length);

          const doc = em.create(Document, {
            organization: ctx.organizationId,
            title: ax.suggestedFilename || `SINOE ${row.nroNotificacion}`,
            filename: ax.suggestedFilename || `${sha.slice(0, 12)}.${ext}`,
            mimeType: 'application/pdf',
            minioKey: key,
            uploadedBy: em.getReference('User', ctx.userId) as any,
            workflowItem: workflowItem ? workflowItem.id : undefined,
          } as any);
          att.document = doc;
        }

        await em.flush();
      }

      em.create(ActivityLog, {
        organization: ctx.organizationId,
        trackable: trackable?.id,
        entityType: 'sinoe_notification',
        entityId: notif.id,
        user: em.getReference('User', ctx.userId) as any,
        action: 'sinoe.notification-received',
        details: {
          event: DomainEvents.SINOE_NOTIFICATION_RECEIVED,
          nroNotificacion: row.nroNotificacion,
          scrapedAt: result.scrapedAt.toISOString(),
        },
      } as any);

      await em.flush();

      /** Un solo evento de bandeja por notificación SINOE (usuario con credenciales). */
      const assignmentStatus = notif.assignmentStatus;
      const inboxMessage = sinoeInboxMessage(assignmentStatus, row, trackable);
      const dedupeKey = `sinoe-notif:${ctx.organizationId}:${row.nroNotificacion}`;
      const inboxRes = await createNotificationEventWithRecipients(em, {
        organizationId: ctx.organizationId,
        trackableId: trackable?.id ?? null,
        type: NOTIFICATION_TYPES.SINOE_NOTIFICATION,
        title: `SINOE: ${row.sumilla.slice(0, 120)}`,
        message: inboxMessage,
        data: {
          severity: 'info',
          source: NOTIFICATION_SOURCE.SCRAPE_SINOE,
          sinoeNotificationId: notif.id,
          nroNotificacion: row.nroNotificacion,
          nroExpediente: row.nroExpediente,
          assignmentStatus,
          workflowItemId: workflowItem?.id,
        },
        dedupeKey,
        sourceEntityType: 'sinoe_notification',
        sourceEntityId: notif.id,
        recipients: [{ userId: ctx.userId, role: NOTIFICATION_RECIPIENT_ROLES.OWNER }],
      });

      if (inboxRes.created) {
        const credUser = (await em.findOne(
          'User' as any,
          { id: ctx.userId, organization: ctx.organizationId } as any,
          { fields: ['id', 'email'] as any, filters: false },
        )) as { id: string; email: string } | null;
        if (credUser?.email) {
          try {
            await sendPlainEmail({
              to: credUser.email,
              subject: `SINOE — ${row.sumilla.slice(0, 80)}`,
              html: `<p>${inboxMessage}</p>`,
            });
            await em.getConnection().execute(
              `UPDATE notification_recipients SET email_sent_at = now()
               WHERE notification_event_id = ? AND user_id = ?`,
              [inboxRes.event.id, credUser.id],
            );
          } catch {
            /* ignore */
          }
        }
      }

      newCount += 1;
      await em.flush();
    }

    return { newCount, totalCount, byStatus };
  }
}
