import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWorkflowItemCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  body!: string;
}
