import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { GoogleSheetsService } from '../services/google-sheets.service';
import { db } from '../database/database';
import { campaigns, logs } from '../database/schema';
import { eq } from 'drizzle-orm';
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {}

  onModuleInit() {
    // Run every 60 seconds; prevent overlaps with isRunning guard
    if (!this.intervalHandle) {
      this.intervalHandle = setInterval(async () => {
        if (this.isRunning) return;
        this.isRunning = true;
        try {
          await this.checkAndRunDueCampaigns();
        } catch (error) {
          console.error('Scheduler loop error:', error);
        } finally {
          this.isRunning = false;
        }
      }, 15_000);
      console.log('⏱️ Scheduler loop started (every 15s)');
    }
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('⏹️ Scheduler loop stopped');
    }
  }

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
      // Re-check latest status to avoid running after deactivation
      const latest = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaign.id));
      const fresh = latest[0];
      if (!fresh || fresh.status !== 'active') {
        console.log('🔕 Skipping run: campaign not active anymore');
        return;
      }
      const now = new Date();
      if (fresh.nextRunAt && new Date(fresh.nextRunAt) > now) {
        console.log('⏩ Skipping run: nextRunAt moved to the future');
        return;
      }
      
      // Extract configurations from fresh campaign data
      const sourceConfig = fresh.sourceConfig as any;
      const targetConfig = fresh.targetConfig as any;
      
      if (!sourceConfig?.googleSheets || !targetConfig?.telegram) {
        console.log('❌ Campaign configuration incomplete');
        return;
      }

      const sheetsConfig = sourceConfig.googleSheets;
      const telegramConfig = targetConfig.telegram;

      // Read a random unposted row from column A where column B is empty
      const sheetsSvc = new GoogleSheetsService(sheetsConfig.credentials);
      console.log(`📋 Looking for unposted rows in spreadsheet: ${sheetsConfig.spreadsheetId}, sheet: ${sheetsConfig.sheetName}`);
      const pick = await sheetsSvc.pickRandomUnpostedRow({
        spreadsheetId: sheetsConfig.spreadsheetId,
        sheetName: sheetsConfig.sheetName,
        contentColumn: 'A',
        statusColumn: 'B',
      });
      if (!pick) {
        console.log('❌ No unposted rows found');
        return;
      }
      console.log(`✅ Found unposted row: ${pick.a1ContentCell}`);
      const textHtml = await sheetsSvc.getCellRichTextHTML(
        sheetsConfig.spreadsheetId,
        sheetsConfig.sheetName,
        pick.a1ContentCell,
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
        
        // Mark row as posted in column B
        const statusCell = `B${pick.rowNumber}`;
        await sheetsSvc.setCellValue({
          spreadsheetId: sheetsConfig.spreadsheetId,
          sheetName: sheetsConfig.sheetName,
          a1Address: statusCell,
          value: 'posted',
        });

        // Update campaign stats and next run time
        await this.updateCampaignAfterRun(fresh);
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
        // Build the start date at the configured hour in the configured timezone
        const startInTimezone = new Date(toZonedTime(new Date(`${startDate}T00:00:00`), timezone));
        startInTimezone.setHours(hour, 0, 0, 0);
        
        // If start date-time is in the future relative to now, use it; otherwise pick the next daily occurrence
        let targetInTimezone = new Date(startInTimezone);
        if (targetInTimezone <= nowInTimezone) {
          // Use today at the hour, or tomorrow if already passed
          targetInTimezone = new Date(nowInTimezone);
          targetInTimezone.setHours(hour, 0, 0, 0);
          if (targetInTimezone <= nowInTimezone) {
            targetInTimezone.setDate(targetInTimezone.getDate() + 1);
          }
        }
        
        // Add randomization
        const randomizedTime = this.addRandomization(targetInTimezone, randomMinutes);
        
        // Convert back to UTC for storage
        const utcTime = fromZonedTime(randomizedTime, timezone);
        console.log(`Scheduler: Next run time in ${timezone}:`, format(randomizedTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }));
        console.log(`Scheduler: Next run time in UTC:`, format(utcTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'UTC' }));
        
        return utcTime;
      }
      
      if (mode === 'hourly') {
        const intervalHours = everyHours || 1;
        const randomMinutes = hourlyRandomMinutes || 0;
        // Build start date-time (at 00:00 start day) in timezone
        const startDayInTimezone = new Date(toZonedTime(new Date(`${startDate}T00:00:00`), timezone));
        
        let base = new Date(nowInTimezone);
        if (nowInTimezone < startDayInTimezone) {
          // If start date is in the future, begin from start date
          base = new Date(startDayInTimezone);
        }
        
        // Round base up to the next top-of-hour
        base.setMinutes(0, 0, 0);
        if (base <= nowInTimezone) {
          base.setHours(base.getHours() + 1);
        }
        
        // Advance to align with the interval relative to start day
        const hoursSinceStart = Math.max(0, Math.ceil((base.getTime() - startDayInTimezone.getTime()) / (60 * 60 * 1000)));
        const remainder = hoursSinceStart % intervalHours;
        const add = remainder === 0 ? 0 : (intervalHours - remainder);
        const nextRunInTimezone = new Date(base);
        nextRunInTimezone.setHours(nextRunInTimezone.getHours() + add);
        
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
