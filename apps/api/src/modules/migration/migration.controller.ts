import { Body, Controller, MessageEvent, Param, Post, Sse, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  MigrationChatRequestDto,
  MigrationCommitPlanBodyDto,
  MigrationProfileRequestDto,
  MigrationSuggestGroupsRequestDto,
} from './dto/migration.dto';
import { MigrationSseAuthGuard } from './migration-sse.guard';
import { MigrationService } from './migration.service';

@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('profile')
  @RequirePermissions('import:manage')
  async profile(
    @Body() dto: MigrationProfileRequestDto,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.migrationService.profileFolderBatch(dto, user.organizationId);
  }

  @Post('suggest-groups')
  @RequirePermissions('import:manage')
  async suggestGroups(
    @Body() dto: MigrationSuggestGroupsRequestDto,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.migrationService.suggestGroups(dto, user.organizationId);
  }

  @Post('chat')
  @RequirePermissions('import:manage')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chat(
    @Body() dto: MigrationChatRequestDto,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.migrationService.chatProxy(dto, user.organizationId);
  }

  @Post('commit-plan')
  @RequirePermissions('import:manage')
  async commitPlan(
    @Body() dto: MigrationCommitPlanBodyDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.migrationService.commitPlan(dto, user.id, user.organizationId);
  }

  @Public()
  @Sse('batches/:id/events')
  @UseGuards(MigrationSseAuthGuard)
  batchEvents(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string },
  ): Observable<MessageEvent> {
    return this.migrationService.subscribeBatchEvents(id, user.organizationId);
  }
}
