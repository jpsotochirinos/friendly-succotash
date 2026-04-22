import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAssistantThreadDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsUUID()
  pinnedTrackableId?: string;
}

export class PatchAssistantThreadDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsUUID()
  pinnedTrackableId?: string;

  @IsOptional()
  @IsBoolean()
  clearPinnedTrackable?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class MessageFeedbackDto {
  @IsIn(['up', 'down', 'none'])
  feedback!: 'up' | 'down' | 'none';
}
