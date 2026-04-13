import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Role, Permission } from '@tracker/db';

@Injectable()
export class RolesService {
  constructor(private readonly em: EntityManager) {}

  async findAll(organizationId: string): Promise<Role[]> {
    return this.em.find(Role, { organization: organizationId } as any, {
      populate: ['permissions'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  async findOne(id: string): Promise<Role> {
    return this.em.findOneOrFail(Role, { id } as any, {
      populate: ['permissions'] as any,
    });
  }

  async create(data: {
    name: string;
    description?: string;
    permissionIds: string[];
    organizationId: string;
  }): Promise<Role> {
    const role = this.em.create(Role, {
      name: data.name,
      description: data.description,
      organization: data.organizationId,
    } as any);

    if (data.permissionIds.length > 0) {
      const permissions = await this.em.find(Permission, { id: { $in: data.permissionIds } } as any);
      role.permissions.set(permissions);
    }

    await this.em.flush();
    return role;
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    permissionIds?: string[];
  }): Promise<Role> {
    const role = await this.findOne(id);

    if (data.name !== undefined) role.name = data.name;
    if (data.description !== undefined) role.description = data.description;

    if (data.permissionIds) {
      const permissions = await this.em.find(Permission, { id: { $in: data.permissionIds } } as any);
      role.permissions.set(permissions);
    }

    await this.em.flush();
    return role;
  }

  async remove(id: string): Promise<void> {
    const role = await this.em.findOneOrFail(Role, { id } as any);
    this.em.remove(role);
    await this.em.flush();
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.em.find(Permission, {}, {
      orderBy: { category: 'ASC', code: 'ASC' } as any,
    });
  }
}
