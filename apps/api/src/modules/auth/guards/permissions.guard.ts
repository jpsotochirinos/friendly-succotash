import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_ANY_KEY, PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const anyPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_ANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const { user } = context.switchToHttp().getRequest();
    const perms: string[] = Array.isArray(user?.permissions) ? user.permissions : [];

    if (anyPermissions?.length) {
      return anyPermissions.some((p: string) => perms.includes(p));
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    if (!user) return false;

    return requiredPermissions.every((perm: string) => perms.includes(perm));
  }
}
