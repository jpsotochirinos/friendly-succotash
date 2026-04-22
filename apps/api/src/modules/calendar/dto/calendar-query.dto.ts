import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CalendarQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @IsIn(['mine', 'team', 'all'])
  @IsOptional()
  scope?: 'mine' | 'team' | 'all';

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  kinds?: string[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  priorities?: string[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  assignees?: string[];

  @IsOptional()
  @IsString()
  trackableId?: string;

  @IsOptional()
  @Transform(({ value }) => value === '1' || value === 'true')
  includeBirthdays?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === '1' || value === 'true')
  includeExternal?: boolean;
}
