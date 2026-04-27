import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../html';
import { invitationTemplate } from './invitation';
import { magicLinkTemplate } from './magic-link';
import { notificationDigestTemplate } from './notification-digest';

describe('email templates', () => {
  it('escapeHtml escapes', () => {
    expect(escapeHtml('<a> &x')).toBe('&lt;a&gt; &amp;x');
  });

  it('invitationTemplate escapes org name and URL', () => {
    const h = invitationTemplate('https://e.com?x=1&y=2', '<script>bad</script>');
    expect(h).toContain('https://e.com?x=1&amp;y=2');
    expect(h).toContain('&lt;script&gt;');
  });

  it('magicLinkTemplate and notificationDigestTemplate produce HTML', () => {
    expect(magicLinkTemplate('https://a.test/l', 'Alega')).toContain('https://a.test/l');
    expect(
      notificationDigestTemplate('T', 'M', 'https://app'),
    ).toContain('Abrir en Alega');
  });
});
