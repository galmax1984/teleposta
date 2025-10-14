import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
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
    console.log("=== RUN BUTTON CLICKED ===");
    console.log("Request body received:", body);
    console.log("Campaign name received:", body.campaignName);
    
    try {
      // Find the campaign by name
      console.log("Looking for campaign with name:", body.campaignName);
      const campaign = await this.campaignsService.findByName(body.campaignName);
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

      const now = new Date();

      if (mode === 'daily') {
        const hour = dailyHour || 20;
        const randomMinutes = dailyRandomMinutes || 0;
        
        // Calculate next run time for today or tomorrow
        const today = new Date();
        today.setHours(hour, 0, 0, 0);
        
        if (today <= now) {
          // If today's time has passed, schedule for tomorrow
          today.setDate(today.getDate() + 1);
        }
        
        return this.addRandomization(today, randomMinutes);
      }
      
      if (mode === 'hourly') {
        const intervalHours = everyHours || 1;
        const randomMinutes = hourlyRandomMinutes || 0;
        
        // Calculate next run time based on hourly interval
        const nextRun = new Date(now);
        nextRun.setMinutes(0, 0, 0); // Round down to the hour
        nextRun.setHours(nextRun.getHours() + intervalHours);
        
        return this.addRandomization(nextRun, randomMinutes);
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
