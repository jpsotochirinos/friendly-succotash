import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EntityManager } from '@mikro-orm/postgresql';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly em: EntityManager) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.organizationId) {
      this.em.setFilterParams('tenant', {
        organizationId: user.organizationId,
      });
      this.em.getFilterParams('tenant');
    }

    return next.handle();
  }
}
