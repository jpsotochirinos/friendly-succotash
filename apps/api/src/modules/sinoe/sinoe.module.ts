import { Module } from '@nestjs/common';
import { SinoeCredentialsController } from './sinoe-credentials.controller';
import { SinoeCredentialsService } from './sinoe-credentials.service';

@Module({
  controllers: [SinoeCredentialsController],
  providers: [SinoeCredentialsService],
})
export class SinoeModule {}
