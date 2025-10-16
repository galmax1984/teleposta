import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, UseGuards, Req } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { type Campaign, type NewCampaign } from '../database/schema';
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { JwtAuthGuard } from '../auth/jwt.guard';

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
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() createCampaignDto: NewCampaign) {
    const userId = req.user?.userId;
    return this.campaignsService.create({ ...createCampaignDto, userId } as any);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req: any) {
    const userId = req.user?.userId;
    return this.campaignsService.findAll(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.userId;
    return this.campaignsService.findOneForUser(+id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() updateCampaignDto: Partial<Campaign>) {
    const userId = req.user?.userId;
    return this.campaignsService.updateForUser(+id, updateCampaignDto, userId);
  }

  @Post('save-stage')
  @UseGuards(JwtAuthGuard)
  saveStage(@Req() req: any, @Body() body: { campaignName: string; stage: any }) {
    const userId = req.user?.userId;
    return this.campaignsService.saveStageByName({ ...body, userId });
  }

  @Post('run-once')
  @UseGuards(JwtAuthGuard)
  async runOnce(
    @Req() req: any,
    @Body()
    body: {
      campaignName: string;
    },
  ) {
    console.log("=== RUN BUTTON CLICKED ===");
    console.log("Request body received:", body);
    console.log("Campaign name received:", body.campaignName);
    
    try {
      // Find the campaign by name
      console.log("Looking for campaign with name:", body.campaignName);
      const userId = req.user?.userId;
      const campaign = await this.campaignsService.findByName(body.campaignName, userId);
      console.log("Found campaign:", campaign ? { id: campaign.id, name: campaign.name } : null);
      
      if (!campaign) {
        console.log("Campaign not found in database");
        return { success: false, message: 'Campaign not found' };
      }

      // Extract scheduler configuration
      const scheduleConfig = campaign.scheduleConfig as any;
      console.log("Schedule config:", scheduleConfig);
      
      if (!scheduleConfig || !scheduleConfig.mode) {
        console.log("Scheduler configuration not found");
        return { success: false, message: 'Scheduler configuration not found' };
      }

      // Recalculate next run time based on scheduler settings
      console.log("Recalculating next run time...");
      const nextRunAt = this.computeNextRunAt(scheduleConfig);
      console.log("Next run time calculated:", nextRunAt);

      // Update campaign with new next run time
      await this.campaignsService.update(campaign.id, {
        nextRunAt,
        status: 'active', // Set to active when Run is clicked
      } as Partial<Campaign>);

      console.log("Campaign updated with next run time:", nextRunAt);
      
      return { 
        success: true, 
        message: `Campaign scheduled. Next run: ${nextRunAt?.toLocaleString()}`,
        nextRunAt: nextRunAt?.toISOString()
      };
    } catch (error: any) {
      console.error("Error in run-once:", error);
      return { success: false, message: `Error: ${error.message}` };
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
      console.log(`Current time in ${timezone}:`, format(nowInTimezone, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }));

      if (mode === 'daily') {
        const hour = dailyHour || 20;
        const randomMinutes = dailyRandomMinutes || 0;
        
        // Create the target time in the configured timezone
        const targetTimeInTimezone = new Date(nowInTimezone);
        targetTimeInTimezone.setHours(hour, 0, 0, 0);
        
        // If the target time has passed today, schedule for tomorrow
        if (targetTimeInTimezone <= nowInTimezone) {
          targetTimeInTimezone.setDate(targetTimeInTimezone.getDate() + 1);
        }
        
        // Add randomization
        const randomizedTime = this.addRandomization(targetTimeInTimezone, randomMinutes);
        
        // Convert back to UTC for storage
        const utcTime = fromZonedTime(randomizedTime, timezone);
        console.log(`Next run time in ${timezone}:`, format(randomizedTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }));
        console.log(`Next run time in UTC:`, format(utcTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'UTC' }));
        
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
        console.log(`Next run time in ${timezone}:`, format(randomizedTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }));
        console.log(`Next run time in UTC:`, format(utcTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'UTC' }));
        
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(+id);
  }
}
