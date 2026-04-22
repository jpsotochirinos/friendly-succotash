import { IsString, IsBoolean, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { FeedItemKind } from '@tracker/db';

export class CreateFeedSourceDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(2048)
  url!: string;

  @IsEnum(FeedItemKind)
  kind!: FeedItemKind;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
