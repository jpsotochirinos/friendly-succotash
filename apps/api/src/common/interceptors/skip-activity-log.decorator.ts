import { SetMetadata } from '@nestjs/common';

export const SKIP_ACTIVITY_LOG = 'skipActivityLog';
export const SkipActivityLog = () => SetMetadata(SKIP_ACTIVITY_LOG, true);
