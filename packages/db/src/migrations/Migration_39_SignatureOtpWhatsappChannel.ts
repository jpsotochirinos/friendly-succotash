import { Migration } from '@mikro-orm/migrations';

/** Widen channel to store "whatsapp" (9 chars) and future values. */
export class Migration39SignatureOtpWhatsappChannel extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "signature_otps"
      ALTER COLUMN "channel" TYPE varchar(32);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "signature_otps"
      ALTER COLUMN "channel" TYPE varchar(8);
    `);
  }
}
