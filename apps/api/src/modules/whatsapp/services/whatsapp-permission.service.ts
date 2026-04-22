import { Injectable } from '@nestjs/common';

/** Permisos WhatsApp alineados con `permissions` en BD (sin nombres de rol). */
@Injectable()
export class WhatsAppPermissionService {
  canUseAssistant(user: { permissions: string[] }): boolean {
    return Boolean(user.permissions?.includes('whatsapp:use_assistant'));
  }

  /** Alcance tipo “ver casos de otros” para resúmenes / briefing (si se usa en SQL). */
  canSeeOthersCases(user: { permissions: string[] }): boolean {
    if (user.permissions?.includes('org:manage')) return true;
    if (user.permissions?.includes('calendar:view_team')) return true;
    return false;
  }

  canManageWhitelist(user: { permissions: string[] }): boolean {
    return user.permissions?.includes('org:manage') ?? false;
  }

  canSendWhatsAppToSelf(user: { permissions: string[] }): boolean {
    return Boolean(user.permissions?.includes('whatsapp:send_to_self'));
  }

  canSendWhatsAppToOthers(user: { permissions: string[] }): boolean {
    return Boolean(user.permissions?.includes('whatsapp:send_to_others'));
  }

  canReceiveWhatsAppNotifications(user: { permissions: string[] }): boolean {
    return Boolean(user.permissions?.includes('whatsapp:receive_notifications'));
  }
}
