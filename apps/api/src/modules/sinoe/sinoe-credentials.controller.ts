import { Body, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { UpsertSinoeCredentialsDto } from './dto/upsert-sinoe-credentials.dto';
import { SinoeCredentialsService } from './sinoe-credentials.service';

@Controller('integrations/sinoe/credentials')
@RequirePermissions('sinoe:manage')
export class SinoeCredentialsController {
  constructor(private readonly sinoeCredentials: SinoeCredentialsService) {}

  @Get()
  async getStatus(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.sinoeCredentials.getStatus(user.id, user.organizationId);
  }

  @Put()
  async upsert(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: UpsertSinoeCredentialsDto,
  ) {
    return this.sinoeCredentials.upsert(user.id, user.organizationId, dto.username, dto.password);
  }

  @Delete()
  async remove(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.sinoeCredentials.remove(user.id, user.organizationId);
  }

  /** Enqueues a single-user SINOE scrape job (Playwright worker). */
  @Post('trigger-scrape')
  async triggerScrape(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.sinoeCredentials.queueScrapeForCurrentUser(user.id, user.organizationId);
  }
}
