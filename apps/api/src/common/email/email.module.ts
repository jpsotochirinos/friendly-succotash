import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createEmailProvider, EMAIL_MESSAGING } from '@tracker/email';
import { buildEmailEnvFromConfig } from './email-env.util';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_MESSAGING,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => createEmailProvider(buildEmailEnvFromConfig(cfg)),
    },
    EmailService,
  ],
  exports: [EmailService, EMAIL_MESSAGING],
})
export class EmailModule {}
