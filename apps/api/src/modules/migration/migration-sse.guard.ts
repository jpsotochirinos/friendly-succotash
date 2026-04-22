import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EntityManager } from '@mikro-orm/postgresql';
import { ExtractJwt } from 'passport-jwt';
import { User } from '@tracker/db';

/**
 * SSE no puede enviar `Authorization` con EventSource estándar; acepta `?access_token=`
 * además del header Bearer.
 */
@Injectable()
export class MigrationSseAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly em: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    let token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token && req.query?.access_token) {
      token = String(req.query.access_token);
    }
    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.getOrThrow('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.em.findOne(
      User,
      { id: payload.sub },
      { populate: ['organization', 'role', 'role.permissions'] as any, filters: false },
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const permissions = user.role?.permissions?.getItems().map((p) => p.code) || [];
    if (!permissions.includes('import:manage')) {
      throw new ForbiddenException('Se requiere import:manage');
    }

    req.user = {
      id: user.id,
      email: user.email,
      organizationId: user.organization.id,
      roleName: user.role?.name,
      permissions,
    };
    return true;
  }
}
