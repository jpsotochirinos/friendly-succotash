import { Injectable, ConflictException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '@tracker/db';
import * as bcrypt from 'bcrypt';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class UsersService extends BaseCrudService<User> {
  constructor(em: EntityManager) {
    super(em, User);
  }

  async createUser(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    roleId?: string;
    organizationId: string;
  }): Promise<User> {
    const existing = await this.em.findOne(User, { email: data.email }, { filters: false });
    if (existing) throw new ConflictException('Email already in use');

    const user = this.em.create(User, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: data.password ? await bcrypt.hash(data.password, 12) : undefined,
      role: data.roleId || undefined,
      organization: data.organizationId,
      isActive: true,
    } as any);

    await this.em.flush();
    return user;
  }
}
