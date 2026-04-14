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
      populate: ['children', 'documents', 'parent'] as any,
      orderBy: { sortOrder: 'ASC', name: 'ASC' } as any,
    });
  }

  async createSubfolder(data: {
    name: string;
    trackableId: string;
    parentId?: string;
    organizationId: string;
  }): Promise<Folder> {
    const existing = await this.em.count(Folder, { trackable: data.trackableId });
    const folder = this.em.create(Folder, {
      name: data.name,
      trackable: data.trackableId,
      parent: data.parentId || undefined,
      organization: data.organizationId,
      sortOrder: existing,
    } as any);
    await this.em.flush();
    return folder;
  }

  async updateFolder(id: string, data: { name?: string; emoji?: string }): Promise<Folder> {
    const folder = await this.em.findOneOrFail(Folder, { id });
    if (data.name !== undefined) folder.name = data.name;
    if (data.emoji !== undefined) (folder as any).emoji = data.emoji;
    await this.em.flush();
    return folder;
  }

  async reorderFolders(orderedIds: string[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.em.nativeUpdate(Folder, { id }, { sortOrder: index } as any),
      ),
    );
  }
}
