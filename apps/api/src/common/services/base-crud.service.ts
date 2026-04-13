import { EntityManager, FilterQuery, FindOptions } from '@mikro-orm/postgresql';
import { NotFoundException } from '@nestjs/common';
import { PaginatedResponse, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@tracker/shared';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export abstract class BaseCrudService<T extends { id: string }> {
  constructor(
    protected readonly em: EntityManager,
    protected readonly entityClass: new (...args: any[]) => T,
  ) {}

  async findAll(
    filters: FilterQuery<T> = {},
    pagination: PaginationQuery = {},
    options: FindOptions<T> = {},
  ): Promise<PaginatedResponse<T>> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, pagination.limit || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const orderBy = pagination.sortBy
      ? { [pagination.sortBy]: pagination.sortOrder || 'ASC' }
      : { createdAt: 'DESC' };

    const [items, total] = await this.em.findAndCount(
      this.entityClass,
      filters,
      {
        ...options,
        limit,
        offset,
        orderBy: orderBy as any,
      } as any,
    );

    return {
      data: items as T[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, options: FindOptions<T> = {}): Promise<T> {
    const entity = await this.em.findOne(this.entityClass, { id } as any, options as any);
    if (!entity) {
      throw new NotFoundException(`${this.entityClass.name} with id '${id}' not found`);
    }
    return entity as T;
  }

  async create(data: Partial<T>): Promise<T> {
    const entity = this.em.create(this.entityClass, data as any);
    await this.em.flush();
    return entity;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const entity = await this.findOne(id);
    this.em.assign(entity, data as any);
    await this.em.flush();
    return entity;
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    this.em.remove(entity);
    await this.em.flush();
  }
}
