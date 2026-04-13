import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Folder } from '@tracker/db';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class FoldersService extends BaseCrudService<Folder> {
  constructor(em: EntityManager) {
    super(em, Folder);
  }

  async getFolderTree(trackableId: string): Promise<Folder[]> {
    return this.em.find(Folder, { trackable: trackableId }, {
      populate: ['children', 'documents'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  async createSubfolder(data: {
    name: string;
    trackableId: string;
    parentId?: string;
    organizationId: string;
  }): Promise<Folder> {
    const folder = this.em.create(Folder, {
      name: data.name,
      trackable: data.trackableId,
      parent: data.parentId || undefined,
      organization: data.organizationId,
    } as any);
    await this.em.flush();
    return folder;
  }
}
