import 'dotenv/config';

export async function sendPlainEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const nodemailer = await import('nodemailer');
  const host = process.env.SMTP_HOST || 'localhost';
  const port = Number(process.env.SMTP_PORT || 1025);
  const transporter = nodemailer.createTransport({ host, port, secure: false });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@tracker.local',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
