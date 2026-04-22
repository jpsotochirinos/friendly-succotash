import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ImportService } from './import.service';
import { ImportOAuthService } from './import-oauth.service';
import { ImportMsGraphService } from './import-ms-graph.service';
import {
  CreateImportBatchDto,
  PatchImportItemDto,
  StartOAuthIngestDto,
} from './dto/create-batch.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly oauthService: ImportOAuthService,
    private readonly msGraphService: ImportMsGraphService,
  ) {}

  @Post('batches')
  @RequirePermissions('import:manage')
  @Throttle({ default: { limit: 5, ttl: 600000 } })
  async createBatch(
    @Body() dto: CreateImportBatchDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    const { batch, uploadToken } = await this.importService.createBatch(
      dto,
      user.id,
      user.organizationId,
    );
    return {
      id: batch.id,
      name: batch.name,
      channel: batch.channel,
      status: batch.status,
      uploadToken,
      stagingExpiresAt: batch.stagingExpiresAt,
    };
  }

  @Get('reporting')
  @RequirePermissions('import:manage')
  async reporting(@CurrentUser() user: { organizationId: string }) {
    return this.importService.getReportingInfo(user.organizationId);
  }

  @Get('batches')
  @RequirePermissions('import:manage')
  async listBatches(@CurrentUser() user: { organizationId: string }) {
    return this.importService.listBatches(user.organizationId);
  }

  @Get('batches/:id')
  @RequirePermissions('import:manage')
  async getBatch(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.importService.getBatch(id, user.organizationId);
  }

  @Get('batches/:id/drive/list')
  @RequirePermissions('import:manage')
  async driveList(
    @Param('id') id: string,
    @Query('parent') parent: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.importService.listDriveFolder(id, user.organizationId, parent || 'root');
  }

  @Post('batches/:id/drive/start')
  @RequirePermissions('import:manage')
  async driveStart(
    @Param('id') id: string,
    @Body() dto: StartOAuthIngestDto,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.importService.startDriveIngest(id, user.organizationId, dto);
  }

  @Get('batches/:id/msgraph/list')
  @RequirePermissions('import:manage')
  async msGraphList(
    @Param('id') id: string,
    @Query('mode') mode: 'onedrive' | 'sharepoint',
    @Query('siteId') siteId: string | undefined,
    @Query('parent') parent: string | undefined,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.msGraphService.listChildren(id, user.organizationId, {
      mode: mode || 'onedrive',
      siteId,
      parentId: parent,
    });
  }

  @Post('batches/:id/msgraph/start')
  @RequirePermissions('import:manage')
  async msGraphStart(
    @Param('id') id: string,
    @Body() dto: StartOAuthIngestDto,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.importService.startMsGraphIngest(id, user.organizationId, dto);
  }

  @Post('agents/register')
  @RequirePermissions('import:manage')
  async registerAgent(
    @Body() body: { label?: string },
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.importService.registerImportAgent(user.id, user.organizationId, body);
  }

  @Post('agents/heartbeat')
  @Public()
  async agentHeartbeat(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { stats?: Record<string, unknown> },
  ) {
    const raw =
      authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined;
    return this.importService.heartbeatImportAgent(raw, body ?? {});
  }

  @Post('batches/:id/ingest-zip')
  @RequirePermissions('import:manage')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  async ingestZip(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { organizationId: string },
  ) {
    if (!file?.buffer) {
      return { error: 'Archivo requerido' };
    }
    return this.importService.ingestZipMultipart(file.buffer, id, user.organizationId);
  }

  @Post('batches/:id/analyze')
  @RequirePermissions('import:manage')
  async analyze(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    await this.importService.enqueueAnalyze(id, user.organizationId);
    return { ok: true };
  }

  @Get('batches/:id/review')
  @RequirePermissions('import:manage')
  async review(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.importService.getReview(id, user.organizationId);
  }

  @Patch('items/:itemId')
  @RequirePermissions('import:manage')
  async patchItem(
    @Param('itemId') itemId: string,
    @Body() dto: PatchImportItemDto,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.importService.patchItem(itemId, dto, user.organizationId);
  }

  @Post('batches/:id/commit')
  @RequirePermissions('import:manage')
  async commit(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.importService.commitBatch(id, user.id, user.organizationId);
    return { ok: true };
  }

  @Post('batches/:id/revert')
  @RequirePermissions('import:manage')
  async revert(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    await this.importService.revertBatch(id, user.organizationId);
    return { ok: true };
  }

  @Get('oauth/google/authorize')
  @RequirePermissions('import:manage')
  googleAuthorize(
    @Query('batchId') batchId: string,
    @Query('redirectUri') redirectUri: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    if (!batchId || !redirectUri) {
      return { error: 'batchId y redirectUri requeridos' };
    }
    const url = this.oauthService.getGoogleDriveAuthUrl(
      batchId,
      user.organizationId,
      redirectUri,
    );
    return { url };
  }

  @Post('oauth/google/exchange')
  @RequirePermissions('import:manage')
  async googleExchange(
    @Body() body: { code: string; redirectUri: string; batchId: string },
    @CurrentUser() user: { organizationId: string },
  ) {
    await this.oauthService.exchangeGoogleCode(
      body.code,
      body.redirectUri,
      body.batchId,
      user.organizationId,
    );
    return { ok: true };
  }

  @Get('oauth/microsoft/authorize')
  @RequirePermissions('import:manage')
  async microsoftAuthorize(
    @Query('batchId') batchId: string,
    @Query('redirectUri') redirectUri: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    if (!batchId || !redirectUri) {
      return { error: 'batchId y redirectUri requeridos' };
    }
    const url = await this.msGraphService.getAuthUrl(
      batchId,
      user.organizationId,
      redirectUri,
    );
    return { url };
  }

  @Post('oauth/microsoft/exchange')
  @RequirePermissions('import:manage')
  async microsoftExchange(
    @Body() body: { code: string; redirectUri: string; batchId: string },
    @CurrentUser() user: { organizationId: string },
  ) {
    await this.msGraphService.exchangeCode(
      body.code,
      body.redirectUri,
      body.batchId,
      user.organizationId,
    );
    return { ok: true };
  }

  @Get('oauth/dropbox/placeholder')
  @RequirePermissions('import:manage')
  dropboxPlaceholder() {
    return this.oauthService.getDropboxAuthUrlPlaceholder();
  }
}
