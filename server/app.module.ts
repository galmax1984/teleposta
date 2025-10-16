import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CampaignsModule } from './campaigns/campaigns.module';
import { LogsModule } from './logs/logs.module';
import { SettingsModule } from './settings/settings.module';
import { DatabaseModule } from './database/database.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { TelegramModule } from './telegram/telegram.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    CampaignsModule,
    LogsModule,
    SettingsModule,
    GoogleSheetsModule,
    TelegramModule,
    SchedulerModule,
    AuthModule,
  ],
})
export class AppModule {}
