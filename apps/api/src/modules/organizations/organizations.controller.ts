import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntityManager } from '@mikro-orm/postgresql';
import { ImportBatch, Organization } from '@tracker/db';
import { ImportBatchStatus, normalizeDocumentTrashRetentionDays } from '@tracker/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';

/** Stored in DB as MinIO object key (fits varchar(255)); API exposes presigned HTTPS URL as `logoUrl`. */
const MAX_ORG_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function logoExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mime] ?? 'bin';
}

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly em: EntityManager,
    private readonly storage: StorageService,
  ) {}

  private brandingPrefix(orgId: string): string {
    return `org-${orgId}/branding/`;
  }

  /** Keys we created under org-.../branding/ — safe to delete on replace/clear. */
  private isManagedBrandingKey(key: string | undefined | null, orgId: string): boolean {
    if (!key) return false;
    return key.startsWith(this.brandingPrefix(orgId));
  }

  private async deleteLogoObjectIfManaged(key: string | undefined | null, orgId: string): Promise<void> {
    if (!this.isManagedBrandingKey(key, orgId)) return;
    try {
      await this.storage.delete(key!);
    } catch {
      // ignore missing object / transient errors
    }
  }

  private async toResponse(org: Organization): Promise<Record<string, unknown>> {
    const logoUrl = org.logoUrl ? await this.storage.getPresignedUrl(org.logoUrl) : null;
    return {
      id: org.id,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      name: org.name,
      planTier: org.planTier,
      settings: org.settings ?? null,
      onboardingState: org.onboardingState ?? null,
      featureFlags: org.featureFlags ?? null,
      workflowActionTypeDefaults: org.workflowActionTypeDefaults ?? null,
      isActive: org.isActive,
      logoUrl,
    };
  }

  @Get('me')
  async getMyOrg(@CurrentUser() user: any) {
    const org = await this.em.findOneOrFail(Organization, { id: user.organizationId }, { filters: false });
    if (org.onboardingState?.migrationCompleted !== true) {
      const hasCommitted = await this.em.count(ImportBatch, {
        organization: user.organizationId,
        status: ImportBatchStatus.COMMITTED,
      } as any);
      if (hasCommitted > 0) {
        org.onboardingState = { ...(org.onboardingState ?? {}), migrationCompleted: true };
        await this.em.flush();
      }
    }
    return this.toResponse(org);
  }

  @Patch('me')
  async updateMyOrg(
    @CurrentUser() user: any,
    @Body() dto: {
      name?: string;
      settings?: Record<string, unknown>;
      onboardingState?: Record<string, unknown>;
      logoUrl?: string | null;
      featureFlags?: { useConfigurableWorkflows?: boolean } & Record<string, unknown>;
      workflowActionTypeDefaults?: Record<string, string> | null;
    },
  ) {
    const org = await this.em.findOneOrFail(Organization, { id: user.organizationId }, { filters: false });
    if (dto.name) org.name = dto.name;
    if (dto.onboardingState) {
      org.onboardingState = { ...(org.onboardingState || {}), ...dto.onboardingState };
    }
    if (dto.logoUrl !== undefined) {
      if (dto.logoUrl === null) {
        await this.deleteLogoObjectIfManaged(org.logoUrl, org.id);
        org.logoUrl = null;
      }
      // Non-null strings are ignored: logo is set only via POST /organizations/me/logo
    }
    if (dto.settings) {
      const next = { ...(org.settings || {}), ...dto.settings };
      if (Object.prototype.hasOwnProperty.call(dto.settings, 'documentTrashRetentionDays')) {
        next.documentTrashRetentionDays = normalizeDocumentTrashRetentionDays(
          dto.settings.documentTrashRetentionDays,
        );
      }
      org.settings = next;
    }
    if (dto.featureFlags !== undefined) {
      org.featureFlags = { ...(org.featureFlags || {}), ...dto.featureFlags };
    }
    if (dto.workflowActionTypeDefaults !== undefined) {
      org.workflowActionTypeDefaults =
        dto.workflowActionTypeDefaults === null ? undefined : dto.workflowActionTypeDefaults;
    }
    await this.em.flush();
    return this.toResponse(org);
  }

  @Post('me/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadOrgLogo(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_ORG_LOGO_BYTES) {
      throw new BadRequestException('File too large');
    }
    if (!ALLOWED_LOGO_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }

    const org = await this.em.findOneOrFail(Organization, { id: user.organizationId }, { filters: false });
    await this.deleteLogoObjectIfManaged(org.logoUrl, org.id);

    const ext = logoExtFromMime(file.mimetype);
    const key = `${this.brandingPrefix(org.id)}logo-${Date.now()}.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    org.logoUrl = key;
    await this.em.flush();
    return this.toResponse(org);
  }
}
