import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WhatsAppPermissionService } from '../services/whatsapp-permission.service';

export const WHATSAPP_ADMIN_KEY = 'whatsapp_admin';

/** Marca ruta que requiere org:manage (whitelist / cuenta firma). */
export const RequireWhatsAppAdmin = () => SetMetadata(WHATSAPP_ADMIN_KEY, true);

@Injectable()
export class WhatsAppPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly perms: WhatsAppPermissionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const admin = this.reflector.getAllAndOverride<boolean>(WHATSAPP_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.permissions) throw new ForbiddenException();
    if (admin && !this.perms.canManageWhitelist(user)) {
      throw new ForbiddenException('Requires org:manage');
    }
    return true;
  }
}
