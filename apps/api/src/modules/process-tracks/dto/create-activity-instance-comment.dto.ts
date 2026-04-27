import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateActivityInstanceCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  body!: string;
}
