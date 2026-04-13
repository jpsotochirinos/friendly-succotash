import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import { User, Organization, Role, Permission } from '@tracker/db';
import { PlanTier } from '@tracker/shared';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.em.findOne(User, { email: dto.email }, { filters: false });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const org = this.em.create(Organization, {
      name: dto.organizationName,
      planTier: PlanTier.FREE,
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

    user.lastLoginAt = new Date();
    await this.em.flush();

    return this.generateAuthResponse(user);
  }

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
      await this.em.flush();
    } else {
      const org = this.em.create(Organization, {
        name: `${googleProfile.firstName || googleProfile.email}'s Organization`,
        planTier: PlanTier.FREE,
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

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: this.config.get('SMTP_PORT', 1025),
      secure: false,
    });

    await transporter.sendMail({
      from: this.config.get('SMTP_FROM', 'noreply@tracker.local'),
      to: email,
      subject: 'Your login link - Tracker',
      html: `
        <h2>Login to Tracker</h2>
        <p>Click the link below to log in. This link expires in 15 minutes.</p>
        <a href="${magicLinkUrl}">Log in to Tracker</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
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

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      user.lastLoginAt = new Date();
      await this.em.flush();

      return this.generateAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }

  async refreshTokens(userId: string, oldRefreshToken: string): Promise<AuthResponseDto> {
    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['organization', 'role'] as any, filters: false },
    );

    if (!user || !user.isActive || user.refreshToken !== oldRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateAuthResponse(user);
  }

  async logout(userId: string): Promise<void> {
    const user = await this.em.findOne(User, { id: userId }, { filters: false });
    if (user) {
      user.refreshToken = undefined;
      await this.em.flush();
    }
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
