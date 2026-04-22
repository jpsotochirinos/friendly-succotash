import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateWorkflowRuleDto {
  @IsString()
  @MaxLength(500)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(120)
  event!: string;

  @IsObject()
  condition!: Record<string, unknown>;

  @IsObject()
  action!: Record<string, unknown>;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @IsOptional()
  scope?: 'org' | 'matterType' | 'template' | 'trackable';

  @IsString()
  @IsOptional()
  scopeId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actionTypes?: string[] | null;
}
