import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { GoogleSheetsService } from '../services/google-sheets.service';
import { TelegramService } from '../telegram/telegram.service';
import { CampaignsService } from './campaigns.service';
import { type Campaign, type NewCampaign } from '../database/schema';

@Controller('api/campaigns')
export class CampaignsController {
  constructor(
    @Inject(CampaignsService) private readonly campaignsService: CampaignsService,
    private readonly telegramService: TelegramService,
  ) {
    // Debug DI
    // eslint-disable-next-line no-console
    console.log('CampaignsController DI campaignsService present:', !!campaignsService);
  }

  @Post()
  create(@Body() createCampaignDto: NewCampaign) {
    return this.campaignsService.create(createCampaignDto);
  }

  @Get()
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCampaignDto: Partial<Campaign>) {
    return this.campaignsService.update(+id, updateCampaignDto);
  }

  @Post('save-stage')
  saveStage(@Body() body: { campaignName: string; stage: any }) {
    return this.campaignsService.saveStageByName(body);
  }

  @Post('run-once')
  async runOnce(
    @Body()
    body: {
      campaignName: string;
    },
  ) {
    console.log("=== RUN-ONCE ENDPOINT CALLED ===");
    console.log("Request body received:", body);
    console.log("Campaign name received:", body.campaignName);
    console.log("Type of campaign name:", typeof body.campaignName);
    console.log("Campaign name length:", body.campaignName?.length);
    
    try {
      // Find the campaign by name
      console.log("Looking for campaign with name:", body.campaignName);
      const campaign = await this.campaignsService.findByName(body.campaignName);
      console.log("Found campaign:", campaign ? { id: campaign.id, name: campaign.name } : null);
      
      if (!campaign) {
        console.log("Campaign not found in database");
        return { success: false, message: 'Campaign not found' };
      }

      // Extract Google Sheets configuration from source config
      const sourceConfig = campaign.sourceConfig as any;
      console.log("Source config:", sourceConfig);
      
      if (!sourceConfig?.googleSheets) {
        console.log("Google Sheets configuration not found");
        return { success: false, message: 'Google Sheets configuration not found' };
      }

      const sheetsConfig = sourceConfig.googleSheets;
      console.log("Sheets config:", {
        hasCredentials: !!sheetsConfig.credentials,
        spreadsheetId: sheetsConfig.spreadsheetId,
        sheetName: sheetsConfig.sheetName,
      });
      
      if (!sheetsConfig.credentials || !sheetsConfig.spreadsheetId || !sheetsConfig.sheetName) {
        console.log("Incomplete Google Sheets configuration");
        return { success: false, message: 'Incomplete Google Sheets configuration' };
      }

      // Extract Telegram configuration from target config
      const targetConfig = campaign.targetConfig as any;
      console.log("Target config:", targetConfig);
      
      if (!targetConfig?.telegram) {
        console.log("Telegram configuration not found");
        return { success: false, message: 'Telegram configuration not found' };
      }

      const telegramConfig = targetConfig.telegram;
      console.log("Telegram config:", {
        hasBotToken: !!telegramConfig.botToken,
        chatIdOrUsername: telegramConfig.chatIdOrUsername,
      });
      
      if (!telegramConfig.botToken || !telegramConfig.chatIdOrUsername) {
        console.log("Incomplete Telegram configuration");
        return { success: false, message: 'Incomplete Telegram configuration' };
      }

      // Read first value of column A (including header)
      console.log("Creating GoogleSheetsService and reading column A...");
      const sheetsSvc = new GoogleSheetsService(sheetsConfig.credentials);
      const values = await sheetsSvc.getColumnValues({
        spreadsheetId: sheetsConfig.spreadsheetId,
        sheetName: sheetsConfig.sheetName,
        column: 'A',
        skipHeader: false,
      });
      
      console.log("Column A values:", values);
      const text = values[0] || '';
      if (!text) {
        console.log("A1 cell is empty");
        return { success: false, message: 'A1 is empty' };
      }

      console.log("Posting to Telegram:", { text: text.substring(0, 100) + "..." });
      // Post to telegram
      const base = `https://api.telegram.org/bot${encodeURIComponent(telegramConfig.botToken)}`;
      const resp = await fetch(`${base}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: telegramConfig.chatIdOrUsername, 
          text,
          parse_mode: telegramConfig.parseMode,
          disable_web_page_preview: telegramConfig.disableWebPagePreview,
          message_thread_id: telegramConfig.messageThreadId,
        }),
      }).then((r) => r.json());

      console.log("Telegram API response:", resp);
      if (!resp?.ok) {
        console.log("Telegram API failed:", resp?.description);
        return { success: false, message: resp?.description || 'Failed to send message' };
      }
      
      console.log("Success! Message sent to Telegram");
      return { success: true, message: 'Message sent successfully' };
    } catch (error: any) {
      console.error("Error in run-once:", error);
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(+id);
  }
}
