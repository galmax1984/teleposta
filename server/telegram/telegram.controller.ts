import { Body, Controller, Inject, Post } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('api/telegram')
export class TelegramController {
  constructor(@Inject(TelegramService) private readonly telegramService: TelegramService) {}

  @Post('test-connection')
  async testConnection(
    @Body()
    body: { botToken: string; chatIdOrUsername: string },
  ) {
    try {
      const ok = await this.telegramService.testConnection(body.botToken, body.chatIdOrUsername);
      return ok
        ? { success: true, message: 'Connection successful.' }
        : { success: false, message: 'Failed to validate bot or channel permissions.' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Connection failed' };
    }
  }
}


