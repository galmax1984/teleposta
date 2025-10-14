import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../services/google-sheets.service';
import { db } from '../database/database';
import { campaigns, logs } from '../database/schema';
import { eq } from 'drizzle-orm';
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';

@Injectable()
export class SchedulerService {
  constructor() {}

  // Manual method to check and run due campaigns (can be called by cron job or manually)
  async checkAndRunDueCampaigns() {
    try {
      console.log('🕐 Checking for due campaigns...');
      
      const now = new Date();
      const dueCampaigns = await db
        .select()
        .from(campaigns)
        .where(
          eq(campaigns.status, 'active')
        );

      console.log(`Found ${dueCampaigns.length} active campaigns`);

      for (const campaign of dueCampaigns) {
        const nextRunAt = campaign.nextRunAt;
        
        if (nextRunAt && new Date(nextRunAt) <= now) {
          console.log(`⏰ Campaign "${campaign.name}" is due to run`);
          await this.runCampaign(campaign);
        }
      }
    } catch (error) {
      console.error('Error in scheduler:', error);
    }
  }

  private async runCampaign(campaign: any) {
    try {
      console.log(`🚀 Running campaign: ${campaign.name}`);
      
      // Extract configurations
      const sourceConfig = campaign.sourceConfig as any;
      const targetConfig = campaign.targetConfig as any;
      
      if (!sourceConfig?.googleSheets || !targetConfig?.telegram) {
        console.log('❌ Campaign configuration incomplete');
        return;
      }

      const sheetsConfig = sourceConfig.googleSheets;
      const telegramConfig = targetConfig.telegram;

      // Read content from Google Sheets
      const sheetsSvc = new GoogleSheetsService(sheetsConfig.credentials);
      const textHtml = await sheetsSvc.getCellRichTextHTML(
        sheetsConfig.spreadsheetId,
        sheetsConfig.sheetName,
        'A1',
      );

      if (!textHtml) {
        console.log('❌ A1 cell is empty');
        return;
      }

      // Post to Telegram
      const base = `https://api.telegram.org/bot${encodeURIComponent(telegramConfig.botToken)}`;
      const resp = await fetch(`${base}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: telegramConfig.chatIdOrUsername, 
          text: textHtml,
          parse_mode: telegramConfig.parseMode || 'HTML',
          disable_web_page_preview: telegramConfig.disableWebPagePreview,
          message_thread_id: telegramConfig.messageThreadId,
        }),
      }).then((r) => r.json());

      if (resp?.ok) {
        console.log('✅ Message sent successfully');
        
        // Update campaign stats and next run time
        await this.updateCampaignAfterRun(campaign);
      } else {
        console.log('❌ Telegram API failed:', resp?.description);
        
        // Log the error
        await db.insert(logs).values({
          level: 'error',
          message: `Failed to send message: ${resp?.description}`,
          campaignId: campaign.id,
        });
      }
    } catch (error) {
      console.error('Error running campaign:', error);
      
      // Log the error
      await db.insert(logs).values({
        level: 'error',
        message: `Campaign execution failed: ${error.message}`,
        campaignId: campaign.id,
      });
    }
  }

  private async updateCampaignAfterRun(campaign: any) {
    try {
      // Compute next run time based on schedule config
      const scheduleConfig = campaign.scheduleConfig as any;
      const nextRunAt = this.computeNextRunAt(scheduleConfig);
      
      // Update campaign
      await db.update(campaigns)
        .set({
          lastRunAt: new Date(),
          nextRunAt,
          totalPosts: (campaign.totalPosts || 0) + 1,
          successfulPosts: (campaign.successfulPosts || 0) + 1,
        })
        .where(eq(campaigns.id, campaign.id));

      console.log(`📅 Next run scheduled for: ${nextRunAt}`);
      
      // Log successful run
      await db.insert(logs).values({
        level: 'info',
        message: `Campaign executed successfully. Next run: ${nextRunAt}`,
        campaignId: campaign.id,
      });
    } catch (error) {
      console.error('Error updating campaign after run:', error);
    }
  }

  private computeNextRunAt(scheduleConfig: any): Date | null {
    try {
      const { mode, timezone, startDate, dailyHour, dailyRandomMinutes, everyHours, hourlyRandomMinutes } = scheduleConfig;
      
      if (!mode || !timezone || !startDate) {
        return null;
      }

      // Get current time in the configured timezone
      const nowInTimezone = toZonedTime(new Date(), timezone);
      console.log(`Scheduler: Current time in ${timezone}:`, format(nowInTimezone, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }));

      if (mode === 'daily') {
        const hour = dailyHour || 20;
        const randomMinutes = dailyRandomMinutes || 0;
        
        // Calculate next run time for tomorrow in the configured timezone
        const tomorrowInTimezone = new Date(nowInTimezone);
        tomorrowInTimezone.setDate(tomorrowInTimezone.getDate() + 1);
        tomorrowInTimezone.setHours(hour, 0, 0, 0);
        
        // Add randomization
        const randomizedTime = this.addRandomization(tomorrowInTimezone, randomMinutes);
        
        // Convert back to UTC for storage
        const utcTime = fromZonedTime(randomizedTime, timezone);
        console.log(`Scheduler: Next run time in ${timezone}:`, format(randomizedTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }));
        console.log(`Scheduler: Next run time in UTC:`, format(utcTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'UTC' }));
        
        return utcTime;
      }
      
      if (mode === 'hourly') {
        const intervalHours = everyHours || 1;
        const randomMinutes = hourlyRandomMinutes || 0;
        
        // Calculate next run time based on hourly interval in the configured timezone
        const nextRunInTimezone = new Date(nowInTimezone);
        nextRunInTimezone.setMinutes(0, 0, 0); // Round down to the hour
        nextRunInTimezone.setHours(nextRunInTimezone.getHours() + intervalHours);
        
        // Add randomization
        const randomizedTime = this.addRandomization(nextRunInTimezone, randomMinutes);
        
        // Convert back to UTC for storage
        const utcTime = fromZonedTime(randomizedTime, timezone);
        console.log(`Scheduler: Next run time in ${timezone}:`, format(randomizedTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }));
        console.log(`Scheduler: Next run time in UTC:`, format(utcTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'UTC' }));
        
        return utcTime;
      }
      
      return null;
    } catch (error) {
      console.error('Error computing next run time:', error);
      return null;
    }
  }

  private addRandomization(baseTime: Date, randomMinutes: number): Date {
    if (randomMinutes <= 0) {
      return baseTime;
    }
    
    const randomMs = Math.random() * randomMinutes * 60 * 1000;
    return new Date(baseTime.getTime() + randomMs);
  }
}
