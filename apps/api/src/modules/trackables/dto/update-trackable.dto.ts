import { PartialType } from '@nestjs/swagger';
import { CreateTrackableDto } from './create-trackable.dto';

export class UpdateTrackableDto extends PartialType(CreateTrackableDto) {}
