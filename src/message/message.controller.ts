import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { UserService } from '../user/user.service';
import axios from 'axios';
import { Message } from './message.schema';

@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly userService: UserService,
  ) {}

  @Post()
  async create(@Body() createMessageDto: Partial<Message>) {
    try {
      const message = await this.messageService.create(createMessageDto);

      const user = await this.userService.findByLocationId(
        createMessageDto.locationId || '1',
      );

      if (
        user &&
        user.ghlAuth &&
        user.ghlAuth.access_token &&
        createMessageDto.messageId
      ) {
        try {
          await axios({
            method: 'PUT',
            url: `https://services.leadconnectorhq.com/conversations/messages/${message.messageId}/status`,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Version: '2021-04-15',
              Authorization: `Bearer ${user.ghlAuth.access_token}`,
            },
            data: {
              status: 'delivered',
            },
          });
        } catch (ghlError) {
          console.error('Error actualizando status en GoHighLevel:', {
            messageId: createMessageDto.messageId,
            status: ghlError.response?.status,
            statusText: ghlError.response?.statusText,
            error: ghlError.response?.data || ghlError.message,
            message: `https://services.leadconnectorhq.com/conversations/messages/${message.messageId}/status`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      return {
        status: 200,
        data: {
          userId: createMessageDto.userId,
          attachments: createMessageDto.attachments,
          contactId: createMessageDto.contactId,
          locationId: createMessageDto.locationId,
          messageId: createMessageDto.messageId,
          type: createMessageDto.type,
          conversationId: createMessageDto.conversationId,
          phone: createMessageDto.phone,
          message: createMessageDto.message,
        },
        savedMessage: message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
