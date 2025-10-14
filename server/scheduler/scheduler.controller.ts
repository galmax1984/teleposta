import { Controller, Post } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

@Controller('api/scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('check-due-campaigns')
  async checkDueCampaigns() {
    await this.schedulerService.checkAndRunDueCampaigns();
    return { success: true, message: 'Scheduler check completed' };
  }
}
