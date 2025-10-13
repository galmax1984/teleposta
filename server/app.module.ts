import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CampaignsModule } from './campaigns/campaigns.module';
import { LogsModule } from './logs/logs.module';
import { SettingsModule } from './settings/settings.module';
import { DatabaseModule } from './database/database.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { TelegramModule } from './telegram/telegram.module';

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
  ],
})
export class AppModule {}
