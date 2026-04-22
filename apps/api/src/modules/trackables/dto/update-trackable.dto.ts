import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TrackableStatus } from '@tracker/shared';
import { CreateTrackableDto } from './create-trackable.dto';

export class UpdateTrackableDto extends PartialType(CreateTrackableDto) {
  @IsOptional()
  @IsEnum(TrackableStatus)
  status?: TrackableStatus;
}
