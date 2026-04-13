import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Trackable, Folder } from '@tracker/db';
import { TrackableStatus } from '@tracker/shared';
import { BaseCrudService, PaginationQuery } from '../../common/services/base-crud.service';
import { CreateTrackableDto } from './dto/create-trackable.dto';

@Injectable()
export class TrackablesService extends BaseCrudService<Trackable> {
  constructor(em: EntityManager) {
    super(em, Trackable);
  }

  async createTrackable(
    dto: CreateTrackableDto,
    userId: string,
    organizationId: string,
  ): Promise<Trackable> {
    const trackable = this.em.create(Trackable, {
      ...dto,
      status: TrackableStatus.CREATED,
      organization: organizationId,
      createdBy: userId,
      assignedTo: dto.assignedToId || undefined,
    } as any);

    this.em.create(Folder, {
      name: dto.title,
      trackable,
      organization: organizationId,
    } as any);

    await this.em.flush();
    return trackable;
  }

  async findByFilters(
    organizationId: string,
    pagination: PaginationQuery,
    filters?: {
      status?: TrackableStatus;
      type?: string;
      assignedToId?: string;
      search?: string;
    },
  ) {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.assignedToId) where.assignedTo = filters.assignedToId;
    if (filters?.search) {
      where.$or = [
        { title: { $ilike: `%${filters.search}%` } },
        { description: { $ilike: `%${filters.search}%` } },
      ];
    }

    return this.findAll(where, pagination, {
      populate: ['createdBy', 'assignedTo'] as any,
    });
  }
}
