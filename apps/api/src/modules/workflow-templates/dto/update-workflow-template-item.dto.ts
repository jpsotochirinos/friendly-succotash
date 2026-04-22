import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowTemplateItemDto } from './create-workflow-template-item.dto';

export class UpdateWorkflowTemplateItemDto extends PartialType(CreateWorkflowTemplateItemDto) {}
