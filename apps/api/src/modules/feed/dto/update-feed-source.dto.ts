import { IsString, IsBoolean, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { FeedItemKind } from '@tracker/db';

export class UpdateFeedSourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsEnum(FeedItemKind)
  kind?: FeedItemKind;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
