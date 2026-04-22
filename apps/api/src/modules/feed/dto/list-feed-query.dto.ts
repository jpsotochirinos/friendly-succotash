import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { FeedItemKind } from '@tracker/db';

export class ListFeedQueryDto {
  @IsOptional()
  @IsEnum(FeedItemKind)
  kind?: FeedItemKind;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}
