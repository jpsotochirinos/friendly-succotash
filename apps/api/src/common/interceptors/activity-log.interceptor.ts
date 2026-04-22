import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { Observable, tap } from 'rxjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { ActivityLog } from '@tracker/db';
import { SKIP_ACTIVITY_LOG } from './skip-activity-log.decorator';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly em: EntityManager,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ACTIVITY_LOG, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (!MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    const user = request.user;
    if (!user) return next.handle();

    const controllerName = context.getClass().name.replace('Controller', '').toLowerCase();
    const handlerName = context.getHandler().name;
    const params = request.params;

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const action = this.resolveAction(method, handlerName);
          const { entityId, detailsExtra } = this.resolveEntityIdForLog(
            responseData,
            params,
          );

          this.em.create(ActivityLog, {
            entityType: controllerName,
            entityId,
            action,
            user: user.id,
            organization: user.organizationId,
            trackable: params?.trackableId || responseData?.trackable?.id || responseData?.trackableId || undefined,
            details: {
              handler: handlerName,
              params: params || {},
              ...detailsExtra,
            },
          } as any);

          await this.em.flush();
        } catch {
          // Activity logging must not break the main request
        }
      }),
    );
  }

  /**
   * `activity_logs.entity_id` is UUID. Many handlers return `{ jobId }` or numeric ids — never use the literal "unknown".
   */
  private resolveEntityIdForLog(
    responseData: Record<string, unknown> | undefined,
    params: Record<string, string> | undefined,
  ): { entityId: string; detailsExtra: Record<string, unknown> } {
    const raw =
      responseData?.id ??
      (responseData as { jobId?: string | number } | undefined)?.jobId ??
      params?.id;
    if (raw == null || raw === '') {
      return { entityId: randomUUID(), detailsExtra: { syntheticEntityId: true } };
    }
    const s = String(raw);
    if (this.isUuid(s)) {
      return { entityId: s, detailsExtra: {} };
    }
    return {
      entityId: randomUUID(),
      detailsExtra: { nonUuidRef: s },
    };
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private resolveAction(method: string, handler: string): string {
    if (handler.includes('transition') || handler.includes('Transition')) return 'transition';
    switch (method) {
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return handler;
    }
  }
}
