import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: Number(this.config.get('SMTP_PORT', 1025)),
      secure: false,
    });

    await transporter.sendMail({
      from: this.config.get('SMTP_FROM', 'noreply@tracker.local'),
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }

  async sendNotificationDigest(options: {
    to: string;
    title: string;
    message: string;
    appUrl?: string;
  }): Promise<void> {
    const base = this.config.get('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    const link = options.appUrl || base;
    await this.sendMail({
      to: options.to,
      subject: options.title,
      html: `
        <h2 style="font-family:system-ui,sans-serif">${this.escapeHtml(options.title)}</h2>
        <p style="font-family:system-ui,sans-serif">${this.escapeHtml(options.message)}</p>
        <p><a href="${this.escapeHtml(link)}">Abrir en Alega</a></p>
      `,
    });
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
