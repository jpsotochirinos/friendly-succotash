import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class SignatureZoneDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @Type(() => Number)
  @IsNumber()
  x!: number;

  @Type(() => Number)
  @IsNumber()
  y!: number;

  @Type(() => Number)
  @IsNumber()
  width!: number;

  @Type(() => Number)
  @IsNumber()
  height!: number;
}
