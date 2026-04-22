import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { FeedItemKind } from '@tracker/db';

export class UpdateFeedItemDto {
  @IsOptional()
  @IsEnum(FeedItemKind)
  kind?: FeedItemKind;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
