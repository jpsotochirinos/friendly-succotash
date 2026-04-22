import {
  Injectable,
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { Invitation, InvitationStatus, User, Role } from '@tracker/db';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

function hashInviteToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly em: EntityManager,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private inviteTtlMs(): number {
    const days = Number(this.config.get('INVITE_EXPIRES_DAYS', '7'));
    if (!Number.isFinite(days) || days < 1) return 7 * 24 * 60 * 60 * 1000;
    return days * 24 * 60 * 60 * 1000;
  }

  private buildInviteUrl(plainToken: string): string {
    const base = this.config.get('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    return `${base}/auth/invite?token=${encodeURIComponent(plainToken)}`;
  }

  private async sendInvitationEmail(to: string, inviteUrl: string, organizationName: string): Promise<void> {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: this.config.get('SMTP_PORT', 1025),
      secure: false,
    });

    await transporter.sendMail({
      from: this.config.get('SMTP_FROM', 'noreply@tracker.local'),
      to,
      subject: `Invitation to join ${organizationName} — Alega`,
      html: `
        <h2>You've been invited</h2>
        <p>You were invited to join <strong>${organizationName}</strong> on Alega.</p>
        <p><a href="${inviteUrl}">Accept invitation</a></p>
        <p>If you did not expect this, you can ignore this email.</p>
      `,
    });
  }

  async getRoleOptions(organizationId: string): Promise<{ id: string; name: string }[]> {
    const roles = await this.em.find(
      Role,
      { organization: organizationId } as any,
      { orderBy: { name: 'ASC' } as any },
    );
    return roles.map((r) => ({ id: r.id, name: r.name }));
  }

  async create(
    dto: CreateInvitationDto,
    organizationId: string,
    invitedByUserId: string,
  ): Promise<{ invitation: Record<string, unknown>; inviteUrl: string }> {
    const email = normalizeEmail(dto.email);

    const existingUser = await this.em.findOne(User, { email }, { filters: false });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const dupPending = await this.em.findOne(
      Invitation,
      { organization: organizationId, email, status: InvitationStatus.PENDING } as any,
      { filters: false },
    );
    if (dupPending) {
      if (dupPending.expiresAt >= new Date()) {
        throw new ConflictException('An active invitation already exists for this email');
      }
      dupPending.status = InvitationStatus.EXPIRED;
      await this.em.flush();
    }

    const role = await this.em.findOne(Role, { id: dto.roleId, organization: organizationId } as any);
    if (!role) {
      throw new BadRequestException('Invalid role for this organization');
    }

    const plainToken = generateOpaqueToken();
    const tokenHash = hashInviteToken(plainToken);
    const expiresAt = new Date(Date.now() + this.inviteTtlMs());

    const invitedBy = await this.em.findOne(User, { id: invitedByUserId }, { filters: false });

    const inv = this.em.create(Invitation, {
      email,
      role,
      tokenHash,
      expiresAt,
      status: InvitationStatus.PENDING,
      organization: organizationId,
      invitedBy: invitedBy ?? undefined,
    } as any);

    await this.em.flush();

    return {
      invitation: this.serializeInvitation(inv),
      inviteUrl: this.buildInviteUrl(plainToken),
    };
  }

  async findAllPending(organizationId: string): Promise<Record<string, unknown>[]> {
    const items = await this.em.find(
      Invitation,
      {
        organization: organizationId,
        status: InvitationStatus.PENDING,
        expiresAt: { $gte: new Date() },
      } as any,
      { populate: ['role'] as any, orderBy: { createdAt: 'DESC' } as any },
    );
    return items.map((i) => this.serializeInvitation(i));
  }

  async revoke(id: string, organizationId: string): Promise<void> {
    const inv = await this.em.findOne(
      Invitation,
      { id, organization: organizationId } as any,
      { filters: false },
    );
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }
    inv.status = InvitationStatus.REVOKED;
    await this.em.flush();
  }

  async sendEmail(id: string, organizationId: string): Promise<{ inviteUrl: string }> {
    const inv = await this.em.findOne(
      Invitation,
      { id, organization: organizationId, status: InvitationStatus.PENDING } as any,
      { populate: ['organization'] as any, filters: false },
    );
    if (!inv) throw new NotFoundException('Pending invitation not found');

    if (inv.expiresAt < new Date()) {
      inv.status = InvitationStatus.EXPIRED;
      await this.em.flush();
      throw new GoneException('This invitation has expired');
    }

    const plainToken = generateOpaqueToken();
    inv.tokenHash = hashInviteToken(plainToken);
    inv.expiresAt = new Date(Date.now() + this.inviteTtlMs());
    await this.em.flush();

    const orgName = inv.organization?.name ?? 'your organization';
    const inviteUrl = this.buildInviteUrl(plainToken);
    await this.sendInvitationEmail(inv.email, inviteUrl, orgName);

    return { inviteUrl };
  }

  async preview(token: string): Promise<{
    email: string;
    organizationName: string;
    roleName: string;
    expiresAt: string;
  }> {
    if (!token?.trim()) {
      throw new BadRequestException('Token is required');
    }
    const tokenHash = hashInviteToken(token.trim());
    const inv = await this.em.findOne(
      Invitation,
      { tokenHash },
      { populate: ['organization', 'role'] as any, filters: false },
    );
    if (!inv) {
      throw new NotFoundException('Invalid or expired invitation');
    }
    if (inv.status !== InvitationStatus.PENDING) {
      throw new GoneException('This invitation is no longer valid');
    }
    if (inv.expiresAt < new Date()) {
      inv.status = InvitationStatus.EXPIRED;
      await this.em.flush();
      throw new GoneException('This invitation has expired');
    }

    return {
      email: inv.email,
      organizationName: inv.organization.name,
      roleName: inv.role.name,
      expiresAt: inv.expiresAt.toISOString(),
    };
  }

  async accept(dto: AcceptInvitationDto) {
    const token = dto.token?.trim();
    if (!token) throw new BadRequestException('Token is required');

    const tokenHash = hashInviteToken(token);
    const inv = await this.em.findOne(
      Invitation,
      { tokenHash },
      { populate: ['organization', 'role'] as any, filters: false },
    );

    if (!inv) {
      throw new NotFoundException('Invalid or expired invitation');
    }
    if (inv.status !== InvitationStatus.PENDING) {
      throw new GoneException('This invitation is no longer valid');
    }
    if (inv.expiresAt < new Date()) {
      inv.status = InvitationStatus.EXPIRED;
      await this.em.flush();
      throw new GoneException('This invitation has expired');
    }

    const existing = await this.em.findOne(User, { email: inv.email }, { filters: false });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.usersService.createUser({
      email: inv.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roleId: inv.role.id,
      organizationId: inv.organization.id,
    });

    inv.status = InvitationStatus.ACCEPTED;
    await this.em.flush();

    return this.authService.issueAuthResponse(user.id);
  }

  private serializeInvitation(inv: Invitation): Record<string, unknown> {
    return {
      id: inv.id,
      email: inv.email,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      role: inv.role ? { id: inv.role.id, name: inv.role.name } : undefined,
    };
  }
}
