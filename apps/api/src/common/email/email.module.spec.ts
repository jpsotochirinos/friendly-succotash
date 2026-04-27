import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email.module';
import { EmailService } from './email.service';
import { EMAIL_MESSAGING, type IEmailProvider } from '@tracker/email';

describe('EmailModule', () => {
  it('resolves EmailService and injected messaging provider', async () => {
    const testEnv = {
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'localhost',
      SMTP_PORT: 1025,
      SMTP_FROM: 'noreply@tracker.local',
    };
    const mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => testEnv as Record<string, unknown>],
        }),
        EmailModule,
      ],
    }).compile();
    const email = mod.get(EmailService);
    const p = mod.get<IEmailProvider>(EMAIL_MESSAGING);
    expect(email).toBeInstanceOf(EmailService);
    expect(p.id).toBe('smtp');
  });
});
