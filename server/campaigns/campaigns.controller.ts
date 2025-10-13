import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { type Campaign, type NewCampaign } from '../database/schema';

@Controller('api/campaigns')
export class CampaignsController {
  constructor(@Inject(CampaignsService) private readonly campaignsService: CampaignsService) {
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(+id);
  }
}
