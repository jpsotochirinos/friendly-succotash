import 'dotenv/config';
import { createEmailProvider, resolveDefaultFrom, type EmailEnv, type IEmailProvider } from '@tracker/email';

let provider: IEmailProvider | null = null;

function getProvider(): IEmailProvider {
  if (!provider) {
    provider = createEmailProvider(process.env as unknown as EmailEnv);
  }
  return provider;
}

export async function sendPlainEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const env = process.env as unknown as EmailEnv;
  const from = resolveDefaultFrom(env);
  await getProvider().sendMail({
    to: { email: options.to },
    from: { email: from, name: env.EMAIL_FROM_NAME },
    subject: options.subject,
    html: options.html,
  });
}
