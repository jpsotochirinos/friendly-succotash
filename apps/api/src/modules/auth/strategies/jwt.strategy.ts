import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '@tracker/db';
import { clearExpiredUserDisable } from '../user-access.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly em: EntityManager,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; org: string; role: string; email: string }): Promise<any> {
    const user = await this.em.findOne(
      User,
      { id: payload.sub },
      { populate: ['organization', 'role', 'role.permissions'] as any, filters: false },
    );

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const cleared = clearExpiredUserDisable(user);
    const now = new Date();
    if (!user.isActive || (user.disabledUntil && user.disabledUntil > now)) {
      throw new UnauthorizedException('User not found or inactive');
    }
    if (cleared) {
      await this.em.flush();
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate
        ? (user.birthDate instanceof Date
            ? user.birthDate.toISOString().slice(0, 10)
            : String(user.birthDate).slice(0, 10))
        : null,
      organizationId: user.organization.id,
      roleName: user.role?.name,
      permissions: user.role?.permissions?.getItems().map((p) => p.code) || [],
    };
  }
}
