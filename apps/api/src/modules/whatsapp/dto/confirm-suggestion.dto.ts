import { IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmSuggestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  suggestionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reply!: string;
}
