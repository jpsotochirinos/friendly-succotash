import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SinoeProposal, User } from '@tracker/db';
import { SinoeProposalStatus } from '@tracker/shared';

@Injectable()
export class SinoeProposalsService {
  constructor(private readonly em: EntityManager) {}

  async list(
    organizationId: string,
    filters?: { status?: SinoeProposalStatus; processTrackId?: string; limit?: number },
  ) {
    const where: Record<string, unknown> = { organization: organizationId };
    if (filters?.status) where['status'] = filters.status;
    if (filters?.processTrackId) where['processTrack'] = { id: filters.processTrackId };
    return this.em.find(SinoeProposal, where, {
      orderBy: { createdAt: 'DESC' },
      limit: filters?.limit ?? 100,
      populate: ['sinoeNotification', 'processTrack'],
    });
  }

  async getOne(id: string, organizationId: string) {
    const p = await this.em.findOne(
      SinoeProposal,
      { id, organization: organizationId },
      { populate: ['sinoeNotification', 'processTrack'] },
    );
    if (!p) throw new NotFoundException();
    return p;
  }

  async approve(id: string, organizationId: string, userId: string) {
    const p = await this.getOne(id, organizationId);
    p.status = SinoeProposalStatus.APPROVED;
    p.approvedAt = new Date();
    p.approvedBy = this.em.getReference(User, userId);
    await this.em.flush();
    return p;
  }

  async reject(id: string, organizationId: string, userId: string, reason: string) {
    const p = await this.getOne(id, organizationId);
    p.status = SinoeProposalStatus.REJECTED;
    p.rejectionReason = reason;
    await this.em.flush();
    return p;
  }

  async revert(id: string, organizationId: string, userId: string) {
    const p = await this.getOne(id, organizationId);
    p.status = SinoeProposalStatus.REVERTED;
    p.revertedAt = new Date();
    p.revertedBy = this.em.getReference(User, userId);
    await this.em.flush();
    return p;
  }

  async stats(organizationId: string) {
    const rows = await this.em.find(SinoeProposal, { organization: organizationId });
    const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    return { total: rows.length, byStatus };
  }
}
