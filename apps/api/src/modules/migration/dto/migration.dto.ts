import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class MigrationSampleSnippetDto {
  @IsString()
  filename!: string;

  @IsString()
  text!: string;
}

export class MigrationFolderProfileDto {
  @IsString()
  relPath!: string;

  @IsOptional()
  fileCount?: number;

  @IsOptional()
  bytes?: number;

  @IsOptional()
  @IsObject()
  extensions?: Record<string, number>;

  @IsOptional()
  @IsArray()
  dateRange?: [string, string];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topTerms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sampleFilenames?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MigrationSampleSnippetDto)
  sampleSnippets?: MigrationSampleSnippetDto[];
}

export class MigrationProfileRequestDto {
  @IsUUID()
  batchId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MigrationFolderProfileDto)
  folders!: MigrationFolderProfileDto[];
}

export class MigrationSuggestGroupsRequestDto {
  @IsUUID()
  batchId!: string;

  @IsObject()
  profile!: Record<string, unknown>;
}

export class MigrationChatMessageDto {
  @IsString()
  role!: string;

  @IsString()
  content!: string;
}

export class MigrationChatRequestDto {
  @IsUUID()
  batchId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MigrationChatMessageDto)
  messages!: MigrationChatMessageDto[];

  @IsOptional()
  @IsString()
  contextRef?: string;
}

export class MigrationPlanGroupInputDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  trackableKind!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileRelPaths?: string[];

  @IsOptional()
  confidence?: number;

  @IsOptional()
  @IsString()
  rationale?: string;

  @IsOptional()
  @IsString()
  expedienteHint?: string;
}

export class MigrationCommitPlanInnerDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MigrationPlanGroupInputDto)
  groups!: MigrationPlanGroupInputDto[];

  @IsOptional()
  @IsObject()
  mappings?: Record<string, { groupId: string; trackableId?: string }>;
}

export class MigrationCommitPlanBodyDto {
  @IsUUID()
  batchId!: string;

  @ValidateNested()
  @Type(() => MigrationCommitPlanInnerDto)
  plan!: MigrationCommitPlanInnerDto;
}
