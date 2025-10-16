import { google } from 'googleapis';

export interface GoogleSheetsCredentials {
  client_email: string;
  private_key: string;
  project_id: string;
  api_key?: string;
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
  private apiKey?: string;

  constructor(credentials: GoogleSheetsCredentials) {
    // Store API key but don't use it for OAuth2 authentication
    this.apiKey = credentials.api_key;
    
    // Fix private key formatting
    let privateKey = credentials.private_key;
    
    // First, replace literal \n with actual newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // If the private key is missing line breaks entirely, add them
    if (privateKey.includes('-----BEGIN PRIVATE KEY-----') && !privateKey.includes('\n')) {
      // Add newlines after BEGIN and before END markers
      privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
      privateKey = privateKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
      
      // Add newlines every 64 characters in the key content
      const beginMarker = '-----BEGIN PRIVATE KEY-----\n';
      const endMarker = '\n-----END PRIVATE KEY-----';
      const keyContent = privateKey.substring(beginMarker.length, privateKey.length - endMarker.length);
      
      // Split the key content into 64-character lines
      const lines = [];
      for (let i = 0; i < keyContent.length; i += 64) {
        lines.push(keyContent.substring(i, i + 64));
      }
      
      privateKey = beginMarker + lines.join('\n') + endMarker;
    }
    
    this.auth = new google.auth.JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Create sheets client with OAuth2 auth only
    this.sheets = google.sheets({ 
      version: 'v4', 
      auth: this.auth
    });
  }

  async testConnection(spreadsheetId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Use OAuth2 authentication only - no API key needed
      await this.sheets.spreadsheets.get({
        spreadsheetId,
      });
      return { success: true, message: 'Connection successful.' };
    } catch (error: any) {
      console.error('Google Sheets connection error:', error);
      return { 
        success: false, 
        message: error.message || 'Connection failed' 
      };
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

  // Read a single cell with rich text runs and return as HTML (supports <b>, <i>)
  async getCellRichTextHTML(
    spreadsheetId: string,
    sheetName: string,
    a1Address: string, // e.g., "A1"
  ): Promise<string> {
    try {
      const range = `${sheetName}!${a1Address}`;
      const resp = await this.sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [range],
        includeGridData: true,
      });

      const sheets = resp.data.sheets || [];
      if (sheets.length === 0) return "";
      const data = sheets[0]?.data?.[0];
      const rowData = data?.rowData?.[0];
      const cell = rowData?.values?.[0];
      if (!cell) return "";

      const userEnteredValue = cell.userEnteredValue;
      const fullText: string = userEnteredValue?.stringValue || cell.formattedValue || "";
      if (!fullText) return "";

      const runs = cell.textFormatRuns as Array<{
        startIndex?: number;
        format?: { bold?: boolean; italic?: boolean; link?: { uri?: string } };
      }> | undefined;

      // If no runs, return escaped plain text
      if (!runs || runs.length === 0) {
        return this.escapeHtml(fullText);
      }

      // Build segments with flags
      type Seg = { text: string; bold: boolean; italic: boolean; href?: string | null };
      const segments: Seg[] = [];
      // Build an array of indices marking style boundaries
      const boundaries = new Set<number>([0, fullText.length]);
      runs.forEach((r) => {
        if (typeof r.startIndex === 'number') boundaries.add(r.startIndex);
      });
      const sorted = Array.from(boundaries).sort((a, b) => a - b);

      // Determine active format for each boundary span
      for (let i = 0; i < sorted.length - 1; i++) {
        const start = sorted[i];
        const end = sorted[i + 1];
        const text = fullText.slice(start, end);
        // Find the last run that starts at or before 'start' to get current style
        let bold = false;
        let italic = false;
        let href: string | undefined | null = null;
        if (runs && runs.length > 0) {
          // Google sets base style implicitly (first run often at 0)
          let lastRun = undefined as undefined | { bold?: boolean; italic?: boolean; link?: { uri?: string } };
          for (const r of runs) {
            if ((r.startIndex ?? 0) <= start) lastRun = r.format;
          }
          if (lastRun) {
            bold = Boolean(lastRun.bold);
            italic = Boolean(lastRun.italic);
            href = lastRun.link?.uri || null;
          }
        }
        segments.push({ text, bold, italic, href });
      }

      // Merge adjacent segments with same style
      const merged: Seg[] = [];
      for (const seg of segments) {
        const prev = merged[merged.length - 1];
        if (prev && prev.bold === seg.bold && prev.italic === seg.italic && prev.href === seg.href) {
          prev.text += seg.text;
        } else {
          merged.push({ ...seg });
        }
      }

      // Render to HTML with escaping
      let html = merged
        .map((seg) => {
          let t = this.escapeHtml(seg.text);
          if (seg.bold) t = `<b>${t}</b>`;
          if (seg.italic) t = `<i>${t}</i>`;
          if (seg.href) {
            const safeHref = this.escapeHtmlAttribute(seg.href);
            t = `<a href="${safeHref}">${t}</a>`;
          }
          return t;
        })
        .join("");

      // If cell has a global hyperlink and no per-run links, wrap entire content
      if (!merged.some(s => s.href) && cell.hyperlink) {
        const safeHref = this.escapeHtmlAttribute(String(cell.hyperlink));
        html = `<a href="${safeHref}">${html}</a>`;
      }

      return html;
    } catch (error) {
      return "";
    }
  }

  private escapeHtml(input: string): string {
    const escaped = input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
    
    console.log("HTML escaping:", { input: input.substring(0, 100), escaped: escaped.substring(0, 100) });
    return escaped;
  }

  private escapeHtmlAttribute(input: string): string {
    // Conservative escaping for attribute values
    return input
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Read a single column's values (default: column A). Skips the header row.
  async getColumnValues(params: {
    spreadsheetId: string;
    sheetName: string;
    column?: string; // e.g., "A"
    skipHeader?: boolean; // default false
  }): Promise<string[]> {
    const columnLetter = (params.column || 'A').toUpperCase();
    const skipHeader = params.skipHeader !== undefined ? params.skipHeader : false;
    try {
      const range = `${params.sheetName}!${columnLetter}:${columnLetter}`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: params.spreadsheetId,
        range,
      });

      const rows: string[][] = response.data.values || [];
      if (rows.length === 0) return [];

      // Optionally skip header row and flatten values
      const dataRows = skipHeader && rows.length > 1 ? rows.slice(1) : rows;
      return dataRows.map((row) => (row && row[0] ? String(row[0]) : ''));
    } catch (error) {
      throw new Error(`Failed to get column ${columnLetter} values: ${error}`);
    }
  }

  // Read a plain cell value (no rich text parsing), returns empty string if not found
  async getCellPlainValue(params: {
    spreadsheetId: string;
    sheetName: string;
    a1Address: string; // e.g., "C12"
  }): Promise<string> {
    const range = `${params.sheetName}!${params.a1Address}`;
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: params.spreadsheetId,
      range,
      majorDimension: 'ROWS',
    });
    const rows: string[][] = response.data.values || [];
    if (!rows.length || !rows[0]?.length) return '';
    return String(rows[0][0] ?? '');
  }

  // Find a random unposted row: content in columnA and empty in columnB
  async pickRandomUnpostedRow(params: {
    spreadsheetId: string;
    sheetName: string;
    contentColumn?: string; // default 'A'
    statusColumn?: string; // default 'B'
    skipHeader?: boolean; // default false
  }): Promise<{ rowNumber: number; a1ContentCell: string } | null> {
    const contentColumn = (params.contentColumn || 'A').toUpperCase();
    const statusColumn = (params.statusColumn || 'B').toUpperCase();
    const skipHeader = params.skipHeader !== undefined ? params.skipHeader : false;
    // Fetch both columns in one request range like A:B to minimize calls
    const startCol = contentColumn;
    const endCol = statusColumn;
    const range = `${params.sheetName}!${startCol}:${endCol}`;
    console.log(`🔍 Fetching range: ${range}`);
    const resp = await this.sheets.spreadsheets.values.get({
      spreadsheetId: params.spreadsheetId,
      range,
      majorDimension: 'ROWS',
    });
    const rows: string[][] = resp.data.values || [];
    console.log(`📊 Found ${rows.length} rows in spreadsheet`);
    if (rows.length === 0) return null;
    const dataRows = skipHeader && rows.length > 1 ? rows.slice(1) : rows;
    console.log(`📋 Processing ${dataRows.length} data rows (skipHeader: ${skipHeader})`);
    const candidates: number[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] || [];
      const content = row[0] ? String(row[0]).trim() : '';
      const status = row[1] ? String(row[1]).trim() : '';
      console.log(`Row ${i + 1}: content="${content}", status="${status}"`);
      if (content && !status) {
        // Convert dataRows index to actual sheet row number
        const rowNumber = (skipHeader ? 2 : 1) + i;
        candidates.push(rowNumber);
        console.log(`✅ Added candidate: row ${rowNumber}`);
      }
    }
    console.log(`🎯 Found ${candidates.length} unposted candidates: [${candidates.join(', ')}]`);
    if (candidates.length === 0) return null;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    console.log(`🎲 Selected row ${chosen} (${contentColumn}${chosen})`);
    return { rowNumber: chosen, a1ContentCell: `${contentColumn}${chosen}` };
  }

  async setCellValue(params: {
    spreadsheetId: string;
    sheetName: string;
    a1Address: string; // e.g., "B12"
    value: string;
  }): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: params.spreadsheetId,
      range: `${params.sheetName}!${params.a1Address}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[params.value]],
      },
    });
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
