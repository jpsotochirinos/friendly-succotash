import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarIntegrationService } from './calendar-integration.service';
import { CalendarRemindersScheduler } from './calendar-reminders.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarIntegrationService, CalendarRemindersScheduler],
  exports: [CalendarService, CalendarIntegrationService],
})
export class CalendarModule {}
