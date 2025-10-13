import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramService {
  private apiBase(token: string) {
    return `https://api.telegram.org/bot${encodeURIComponent(token)}`;
  }

  async testConnection(botToken: string, chatIdOrUsername: string): Promise<boolean> {
    // 1) getMe
    const me = await fetch(`${this.apiBase(botToken)}/getMe`).then((r) => r.json());
    if (!me?.ok) throw new Error(me?.description || 'Invalid bot token');

    // 2) getChat
    const getChat = await fetch(
      `${this.apiBase(botToken)}/getChat?chat_id=${encodeURIComponent(chatIdOrUsername)}`,
    ).then((r) => r.json());
    if (!getChat?.ok) throw new Error(getChat?.description || 'Chat not found');

    // 3) getChatMember for the bot
    const botUserId = me.result.id;
    const member = await fetch(
      `${this.apiBase(botToken)}/getChatMember?chat_id=${encodeURIComponent(
        chatIdOrUsername,
      )}&user_id=${botUserId}`,
    ).then((r) => r.json());
    if (!member?.ok) throw new Error(member?.description || 'Cannot check bot permissions');

    const status = member.result.status as string;
    const canPost =
      status === 'administrator' || status === 'creator' || member.result.can_post_messages === true;
    if (!canPost) throw new Error('Bot lacks permission to post to this chat');

    // 4) sendChatAction (typing) as a harmless permission check
    const action = await fetch(`${this.apiBase(botToken)}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatIdOrUsername, action: 'typing' }),
    }).then((r) => r.json());
    if (!action?.ok) throw new Error(action?.description || 'Failed to send chat action');

    return true;
  }

  async sendMessage(params: {
    botToken: string;
    chatIdOrUsername: string;
    text: string;
    parseMode?: 'MarkdownV2' | 'HTML' | 'None';
    disableWebPagePreview?: boolean;
    messageThreadId?: string;
  }): Promise<void> {
    const payload: any = {
      chat_id: params.chatIdOrUsername,
      text: params.text,
      disable_web_page_preview: Boolean(params.disableWebPagePreview),
    };
    if (params.parseMode && params.parseMode !== 'None') payload.parse_mode = params.parseMode;
    if (params.messageThreadId) payload.message_thread_id = params.messageThreadId;

    const res = await fetch(`${this.apiBase(params.botToken)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => r.json());
    if (!res?.ok) throw new Error(res?.description || 'Failed to send message');
  }
}


