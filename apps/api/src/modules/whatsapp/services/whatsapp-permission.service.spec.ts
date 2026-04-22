import { describe, it, expect } from 'vitest';
import { WhatsAppPermissionService } from './whatsapp-permission.service';

describe('WhatsAppPermissionService', () => {
  const svc = new WhatsAppPermissionService();

  it('canUseAssistant requires whatsapp:use_assistant', () => {
    expect(svc.canUseAssistant({ permissions: [] })).toBe(false);
    expect(svc.canUseAssistant({ permissions: ['whatsapp:use_assistant'] })).toBe(true);
  });

  it('canSendWhatsAppToSelf', () => {
    expect(svc.canSendWhatsAppToSelf({ permissions: ['whatsapp:send_to_self'] })).toBe(true);
    expect(svc.canSendWhatsAppToSelf({ permissions: [] })).toBe(false);
  });

  it('canSendWhatsAppToOthers', () => {
    expect(svc.canSendWhatsAppToOthers({ permissions: ['whatsapp:send_to_others'] })).toBe(true);
  });

  it('canReceiveWhatsAppNotifications', () => {
    expect(svc.canReceiveWhatsAppNotifications({ permissions: ['whatsapp:receive_notifications'] })).toBe(
      true,
    );
  });

  it('canSeeOthersCases org:manage or calendar:view_team', () => {
    expect(svc.canSeeOthersCases({ permissions: [] })).toBe(false);
    expect(svc.canSeeOthersCases({ permissions: ['org:manage'] })).toBe(true);
    expect(svc.canSeeOthersCases({ permissions: ['calendar:view_team'] })).toBe(true);
  });

  it('canManageWhitelist', () => {
    expect(svc.canManageWhitelist({ permissions: ['org:manage'] })).toBe(true);
  });
});
