import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Client } from '@tracker/db';
import { BaseCrudService, PaginationQuery } from '../../common/services/base-crud.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService extends BaseCrudService<Client> {
  constructor(em: EntityManager) {
    super(em, Client);
  }

  async createForOrg(dto: CreateClientDto, organizationId: string): Promise<Client> {
    const client = this.em.create(Client, {
      ...dto,
      organization: organizationId,
    } as any);
    await this.em.flush();
    return client;
  }

  async updateClient(id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    this.em.assign(client, dto as any);
    await this.em.flush();
    return client;
  }

  async findAllForOrg(pagination: PaginationQuery, search?: string) {
    const where: any = {};
    if (search) {
      where.$or = [
        { name: { $ilike: `%${search}%` } },
        { email: { $ilike: `%${search}%` } },
      ];
    }
    return this.findAll(where, pagination, { orderBy: { name: 'ASC' } as any });
  }
}
