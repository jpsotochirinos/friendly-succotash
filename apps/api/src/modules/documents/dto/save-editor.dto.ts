import { IsString, IsObject, IsOptional } from 'class-validator';

export class SaveEditorContentDto {
  @IsObject()
  editorContent!: Record<string, unknown>;

  @IsString()
  @IsOptional()
  contentText?: string;
}
