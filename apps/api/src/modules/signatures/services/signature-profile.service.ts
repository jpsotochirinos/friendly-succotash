import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SignatureProfile, User } from '@tracker/db';
import { StorageService } from '../../storage/storage.service';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']);
const MAX_BYTES = 2 * 1024 * 1024;

@Injectable()
export class SignatureProfileService {
  constructor(
    private readonly em: EntityManager,
    private readonly storage: StorageService,
  ) {}

  private keyFor(organizationId: string, userId: string, name: 'signature' | 'initials', ext: string) {
    return `signatures/${organizationId}/${userId}/${name}.${ext}`;
  }

  private extFromMime(mime: string): string {
    if (mime === 'image/svg+xml') return 'svg';
    if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
    return 'png';
  }

  async uploadSignature(
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<SignatureProfile> {
    const mime = file.mimetype || 'application/octet-stream';
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException('Formato de imagen no permitido (PNG, JPG, SVG).');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('El archivo no debe superar 2MB.');
    }
    const ext = this.extFromMime(mime);
    const storageKey = this.keyFor(organizationId, userId, 'signature', ext);
    await this.storage.upload(storageKey, file.buffer, mime);

    let profile = await this.em.findOne(SignatureProfile, { user: userId, organization: organizationId });
    if (!profile) {
      profile = this.em.create(SignatureProfile, {
        organization: organizationId,
        user: this.em.getReference(User, userId),
        storageKey,
        mimeType: mime,
        isActive: true,
      } as any);
    } else {
      if (profile.storageKey && profile.storageKey !== storageKey) {
        try {
          await this.storage.delete(profile.storageKey);
        } catch {
          /* ignore */
        }
      }
      profile.storageKey = storageKey;
      profile.mimeType = mime;
      profile.isActive = true;
    }
    await this.em.flush();
    return profile;
  }

  async getMyProfile(organizationId: string, userId: string): Promise<SignatureProfile | null> {
    return this.em.findOne(SignatureProfile, { user: userId, organization: organizationId });
  }

  /** Serialized profile + presigned preview URL for the SPA settings page. */
  async getMyProfileForClient(organizationId: string, userId: string): Promise<{
    id: string;
    mimeType: string;
    isActive: boolean;
    previewUrl: string | null;
  } | null> {
    const p = await this.getMyProfile(organizationId, userId);
    if (!p) return null;
    const previewUrl = await this.storage.getPresignedUrl(p.storageKey);
    return {
      id: p.id,
      mimeType: p.mimeType,
      isActive: p.isActive,
      previewUrl,
    };
  }

  async getByUserId(organizationId: string, userId: string, requesterPermissions: string[]): Promise<SignatureProfile> {
    if (!requesterPermissions.includes('signature:manage_profiles') && !requesterPermissions.includes('org:manage')) {
      throw new ForbiddenException();
    }
    const p = await this.em.findOne(SignatureProfile, { user: userId, organization: organizationId });
    if (!p) throw new NotFoundException();
    return p;
  }

  async deleteMyProfile(organizationId: string, userId: string): Promise<void> {
    const profile = await this.getMyProfile(organizationId, userId);
    if (!profile) throw new NotFoundException();
    try {
      await this.storage.delete(profile.storageKey);
    } catch {
      /* ignore */
    }
    if (profile.initialsStorageKey) {
      try {
        await this.storage.delete(profile.initialsStorageKey);
      } catch {
        /* ignore */
      }
    }
    await this.em.removeAndFlush(profile);
  }

  async getSignatureImageBuffer(organizationId: string, userId: string): Promise<Buffer> {
    const p = await this.getMyProfile(organizationId, userId);
    if (!p) throw new BadRequestException('No hay una firma registrada en su perfil.');
    return this.storage.download(p.storageKey);
  }

  async getSignatureImageForUser(organizationId: string, userId: string): Promise<{ buffer: Buffer; mime: string }> {
    const p = await this.em.findOne(SignatureProfile, { user: userId, organization: organizationId });
    if (!p) throw new BadRequestException('El firmante no tiene firma en el perfil.');
    const buffer = await this.storage.download(p.storageKey);
    return { buffer, mime: p.mimeType };
  }

  async listTeamProfiles(organizationId: string): Promise<SignatureProfile[]> {
    return this.em.find(SignatureProfile, { organization: organizationId, isActive: true }, { populate: ['user'] });
  }
}
