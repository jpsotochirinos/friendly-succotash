import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import { User, Organization, Role, Permission } from '@tracker/db';
import { PlanTier } from '@tracker/shared';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { EmailService } from '../../common/email/email.service';
import { assertUserCanAuthenticate, clearExpiredUserDisable } from './user-access.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  /** Public signup flow: whether this email can register (not already in use). */
  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    const trimmed = email?.trim();
    if (!trimmed) {
      throw new BadRequestException('Email is required');
    }
    const existing = await this.em.findOne(User, { email: trimmed }, { filters: false });
    return { available: !existing };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.em.findOne(User, { email: dto.email }, { filters: false });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const org = this.em.create(Organization, {
      name: dto.organizationName,
      planTier: PlanTier.FREE,
      featureFlags: { useConfigurableWorkflows: true },
    });

    const allPermissions = await this.em.findAll(Permission);
    const ownerRole = this.em.create(Role, {
      name: 'Owner',
      description: 'Full access to all features',
      isSystem: true,
      organization: org,
    });
    ownerRole.permissions.set(allPermissions);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.em.create(User, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      organization: org,
      role: ownerRole,
      isActive: true,
    });

    await this.em.flush();
    return this.generateAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.em.findOne(
      User,
      { email: dto.email },
      { populate: ['organization', 'role'] as any, filters: false },
    );

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (clearExpiredUserDisable(user)) {
      await this.em.flush();
    }
    assertUserCanAuthenticate(user);

    user.lastLoginAt = new Date();
    await this.em.flush();

    return this.generateAuthResponse(user);
  }

  /**
   * Google OAuth callback: find user by googleId or email; link googleId to existing
   * email; create org + Owner role for new users. MVP: see docs/auth-google-oauth.md.
   */
  async googleLogin(googleProfile: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }): Promise<AuthResponseDto> {
    let user = await this.em.findOne(
      User,
      { $or: [{ googleId: googleProfile.googleId }, { email: googleProfile.email }] },
      { populate: ['organization', 'role'] as any, filters: false },
    );

    if (user) {
      if (!user.googleId) {
        user.googleId = googleProfile.googleId;
      }
      if (googleProfile.avatarUrl) {
        user.avatarUrl = googleProfile.avatarUrl;
      }
      user.lastLoginAt = new Date();
      clearExpiredUserDisable(user);
      await this.em.flush();
      assertUserCanAuthenticate(user);
    } else {
      const org = this.em.create(Organization, {
        name: `${googleProfile.firstName || googleProfile.email}'s Organization`,
        planTier: PlanTier.FREE,
        featureFlags: { useConfigurableWorkflows: true },
      });

      const allPermissions = await this.em.findAll(Permission);
      const ownerRole = this.em.create(Role, {
        name: 'Owner',
        isSystem: true,
        organization: org,
      });
      ownerRole.permissions.set(allPermissions);

      user = this.em.create(User, {
        email: googleProfile.email,
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
        googleId: googleProfile.googleId,
        avatarUrl: googleProfile.avatarUrl,
        organization: org,
        role: ownerRole,
        isActive: true,
        lastLoginAt: new Date(),
      });

      await this.em.flush();
    }

    return this.generateAuthResponse(user);
  }

  async sendMagicLink(email: string): Promise<void> {
    const user = await this.em.findOne(User, { email }, { filters: false });
    if (!user) {
      return;
    }

    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'magic-link' },
      {
        secret: this.config.getOrThrow('MAGIC_LINK_SECRET'),
        expiresIn: this.config.get('MAGIC_LINK_EXPIRES_IN', '15m'),
      },
    );

    const magicLinkUrl = `${this.config.get('FRONTEND_URL')}/auth/magic-link?token=${token}`;

    await this.email.sendMagicLinkEmail(email, magicLinkUrl);
  }

  async verifyMagicLink(token: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.getOrThrow('MAGIC_LINK_SECRET'),
      });

      if (payload.type !== 'magic-link') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.em.findOne(
        User,
        { id: payload.sub },
        { populate: ['organization', 'role'] as any, filters: false },
      );

      if (!user) {
        throw new UnauthorizedException('User not found or inactive');
      }
      clearExpiredUserDisable(user);
      await this.em.flush();
      assertUserCanAuthenticate(user);

      user.lastLoginAt = new Date();
      await this.em.flush();

      return this.generateAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }

  /**
   * Password reset: JWT signed with MAGIC_LINK_SECRET, type `password-reset`.
   * In non-production, response may include `devResetUrl` for Mailpit-free local testing.
   */
  async requestPasswordReset(email: string): Promise<{ message: string; devResetUrl?: string }> {
    const trimmed = email?.trim();
    if (!trimmed) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const user = await this.em.findOne(User, { email: trimmed }, { filters: false });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'password-reset' },
      {
        secret: this.config.getOrThrow('MAGIC_LINK_SECRET'),
        expiresIn: this.config.get('PASSWORD_RESET_EXPIRES_IN', '30m'),
      },
    );

    const base = this.config.get('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${base}/auth/reset-password?token=${encodeURIComponent(token)}`;

    await this.email.sendPasswordResetEmail(trimmed, resetUrl);

    const devResetUrl =
      this.config.get('NODE_ENV', 'development') !== 'production' ? resetUrl : undefined;

    return { message: 'If the email exists, a reset link has been sent', devResetUrl };
  }

  async resetPassword(token: string, plainPassword: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<{ sub: string; type?: string }>(token, {
        secret: this.config.getOrThrow('MAGIC_LINK_SECRET'),
      });

      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.em.findOne(
        User,
        { id: payload.sub },
        { populate: ['organization', 'role'] as any, filters: false },
      );

      if (!user) {
        throw new UnauthorizedException('User not found or inactive');
      }

      clearExpiredUserDisable(user);
      await this.em.flush();
      assertUserCanAuthenticate(user);

      user.passwordHash = await bcrypt.hash(plainPassword, 12);
      user.refreshToken = undefined;
      user.lastLoginAt = new Date();
      await this.em.flush();

      return this.generateAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset link');
    }
  }

  async refreshTokens(userId: string, oldRefreshToken: string): Promise<AuthResponseDto> {
    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['organization', 'role'] as any, filters: false },
    );

    if (!user || user.refreshToken !== oldRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    clearExpiredUserDisable(user);
    await this.em.flush();
    assertUserCanAuthenticate(user);

    return this.generateAuthResponse(user);
  }

  async logout(userId: string): Promise<void> {
    const user = await this.em.findOne(User, { id: userId }, { filters: false });
    if (user) {
      user.refreshToken = undefined;
      await this.em.flush();
    }
  }

  /** Issue tokens after invitation accept or similar server-side user creation. */
  async issueAuthResponse(userId: string): Promise<AuthResponseDto> {
    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['organization', 'role'] as any, filters: false },
    );
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }
    clearExpiredUserDisable(user);
    await this.em.flush();
    assertUserCanAuthenticate(user);
    return this.generateAuthResponse(user);
  }

  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      org: user.organization.id,
      role: user.role?.id || '',
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, org: user.organization.id },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    user.refreshToken = refreshToken;
    await this.em.flush();

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organization.id,
        role: user.role?.name,
      },
    };
  }
}
