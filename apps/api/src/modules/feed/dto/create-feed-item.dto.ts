import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { FeedItemKind } from '@tracker/db';

export class CreateFeedItemDto {
  @IsEnum(FeedItemKind)
  kind!: FeedItemKind;

  @IsString()
  @MaxLength(2000)
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  /** If omitted for Alega items, server sets a default link */
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
