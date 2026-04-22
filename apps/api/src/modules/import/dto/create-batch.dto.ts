import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ImportChannel } from '@tracker/shared';

export class CreateImportBatchDto {
  @IsString()
  @MaxLength(500)
  name!: string;

  @IsEnum(ImportChannel)
  channel!: ImportChannel;

  @IsOptional()
  config?: Record<string, unknown>;
}

/** Inicio de ingesta desde Google Drive o Microsoft Graph (OneDrive / SharePoint). */
export class StartOAuthIngestDto {
  @IsOptional()
  @IsString()
  rootFolderId?: string;

  /** Site ID de Graph (p. ej. `contoso.sharepoint.com:/sites/Team`). */
  @IsOptional()
  @IsString()
  siteId?: string;

  /** Carpeta raíz como item de drive (`root` se omite y usa `/root/children`). */
  @IsOptional()
  @IsString()
  rootItemId?: string;

  @IsOptional()
  @IsIn(['onedrive', 'sharepoint'])
  mode?: 'onedrive' | 'sharepoint';
}

export class PatchImportItemDto {
  @IsOptional()
  @IsString()
  suggestedTrackableKey?: string;

  @IsOptional()
  classification?: {
    actionType?: string;
    kind?: string;
    confidence?: number;
  };
}
