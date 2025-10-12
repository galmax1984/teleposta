import { google } from 'googleapis';

export interface GoogleSheetsCredentials {
  client_email: string;
  private_key: string;
  project_id: string;
}

export interface GoogleSheetsConfig {
  credentials: GoogleSheetsCredentials;
  spreadsheetId: string;
  sheetName: string;
  range?: string;
  contentColumn: string;
  imageColumn?: string;
  metadataColumn?: string;
}

export interface SheetRow {
  id: string;
  content: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  rowNumber: number;
}

export class GoogleSheetsService {
  private sheets: any;
  private auth: any;

  constructor(credentials: GoogleSheetsCredentials) {
    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: 'test',
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSpreadsheetInfo(spreadsheetId: string): Promise<any> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });
      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map((sheet: any) => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get spreadsheet info: ${error}`);
    }
  }

  async getSheetData(config: GoogleSheetsConfig): Promise<SheetRow[]> {
    try {
      const range = config.range || `${config.sheetName}!A:Z`;
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      // First row is headers
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Find column indices
      const contentIndex = this.findColumnIndex(headers, config.contentColumn);
      const imageIndex = config.imageColumn ? this.findColumnIndex(headers, config.imageColumn) : -1;
      const metadataIndex = config.metadataColumn ? this.findColumnIndex(headers, config.metadataColumn) : -1;

      if (contentIndex === -1) {
        throw new Error(`Content column "${config.contentColumn}" not found`);
      }

      return dataRows.map((row: string[], index: number) => ({
        id: `row-${index + 2}`, // +2 for header row and 0-based index
        content: row[contentIndex] || '',
        imageUrl: imageIndex >= 0 ? row[imageIndex] : undefined,
        metadata: metadataIndex >= 0 ? this.parseMetadata(row[metadataIndex]) : {},
        rowNumber: index + 2,
      }));
    } catch (error) {
      throw new Error(`Failed to get sheet data: ${error}`);
    }
  }

  private findColumnIndex(headers: string[], columnName: string): number {
    // Try exact match first
    let index = headers.findIndex(header => header === columnName);
    if (index !== -1) return index;

    // Try case-insensitive match
    index = headers.findIndex(header => 
      header.toLowerCase() === columnName.toLowerCase()
    );
    if (index !== -1) return index;

    // Try column letter (A, B, C, etc.)
    if (/^[A-Z]+$/i.test(columnName)) {
      return this.columnLetterToIndex(columnName);
    }

    return -1;
  }

  private columnLetterToIndex(columnLetter: string): number {
    let index = 0;
    for (let i = 0; i < columnLetter.length; i++) {
      index = index * 26 + (columnLetter.charCodeAt(i) - 64);
    }
    return index - 1; // Convert to 0-based index
  }

  private parseMetadata(metadataString: string): Record<string, any> {
    try {
      return JSON.parse(metadataString);
    } catch {
      // If not valid JSON, return as simple object
      return { raw: metadataString };
    }
  }

  async validateSpreadsheetAccess(spreadsheetId: string): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId,
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}
