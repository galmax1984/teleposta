import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { GoogleSheetsService, GoogleSheetsCredentials, GoogleSheetsConfig } from '../services/google-sheets.service';

@Controller('api/google-sheets')
export class GoogleSheetsController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  @Post('test-connection')
  async testConnection(@Body() credentials: GoogleSheetsCredentials) {
    try {
      const service = new GoogleSheetsService(credentials);
      const isValid = await service.testConnection();
      return { success: isValid, message: isValid ? 'Connection successful' : 'Connection failed' };
    } catch (error) {
      return { success: false, message: `Connection error: ${error.message}` };
    }
  }

  @Post('get-spreadsheet-info')
  async getSpreadsheetInfo(
    @Body() body: { credentials: GoogleSheetsCredentials; spreadsheetId: string }
  ) {
    try {
      const service = new GoogleSheetsService(body.credentials);
      const info = await service.getSpreadsheetInfo(body.spreadsheetId);
      return { success: true, data: info };
    } catch (error) {
      return { success: false, message: `Failed to get spreadsheet info: ${error.message}` };
    }
  }

  @Post('validate-access')
  async validateAccess(
    @Body() body: { credentials: GoogleSheetsCredentials; spreadsheetId: string }
  ) {
    try {
      const service = new GoogleSheetsService(body.credentials);
      const hasAccess = await service.validateSpreadsheetAccess(body.spreadsheetId);
      return { success: hasAccess, message: hasAccess ? 'Access granted' : 'Access denied' };
    } catch (error) {
      return { success: false, message: `Access validation error: ${error.message}` };
    }
  }

  @Post('get-sheet-data')
  async getSheetData(@Body() config: GoogleSheetsConfig) {
    try {
      const service = new GoogleSheetsService(config.credentials);
      const data = await service.getSheetData(config);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: `Failed to get sheet data: ${error.message}` };
    }
  }
}
