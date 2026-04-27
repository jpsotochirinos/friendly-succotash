import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { SearchModule } from '../search/search.module';
import { BlueprintsModule } from '../blueprints/blueprints.module';

@Module({
  imports: [SearchModule, BlueprintsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
