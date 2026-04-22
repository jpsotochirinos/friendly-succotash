import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import type { MatterType } from '@tracker/shared';
import { MATTER_TYPE_VALUES } from '../../../common/class-validator-enums';

export class CreateWorkflowTemplateDto {
  @IsString()
  @MaxLength(500)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn([...MATTER_TYPE_VALUES])
  matterType!: MatterType;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  jurisdiction?: string;
}
