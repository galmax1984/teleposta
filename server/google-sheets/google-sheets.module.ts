import { Module } from '@nestjs/common';
import { GoogleSheetsController } from './google-sheets.controller';

@Module({
  controllers: [GoogleSheetsController],
})
export class GoogleSheetsModule {}
