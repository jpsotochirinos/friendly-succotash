import { Controller, Get, Patch, Body } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Organization } from '@tracker/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly em: EntityManager) {}

  @Get('me')
  async getMyOrg(@CurrentUser() user: any) {
    return this.em.findOneOrFail(Organization, { id: user.organizationId }, { filters: false });
  }

  @Patch('me')
  async updateMyOrg(
    @CurrentUser() user: any,
    @Body() dto: { name?: string; settings?: Record<string, unknown>; logoUrl?: string },
  ) {
    const org = await this.em.findOneOrFail(Organization, { id: user.organizationId }, { filters: false });
    if (dto.name) org.name = dto.name;
    if (dto.logoUrl !== undefined) org.logoUrl = dto.logoUrl;
    if (dto.settings) {
      org.settings = { ...(org.settings || {}), ...dto.settings };
    }
    await this.em.flush();
    return org;
  }
}
