import {
  Controller,
  Post,
  Get,
  Param,
  Query,
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

  @Get(':locationId')
  async getMessagesByLocationId(
    @Param('locationId') locationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    try {
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
      const { messages, total } = await this.messageService.findByLocationId(
        locationId,
        pageNum,
        limitNum,
      );
      return {
        status: 200,
        data: messages,
        total,
        page: pageNum,
        limit: limitNum,
        locationId,
        totalPages: Math.ceil(total / limitNum),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post()
  async create(@Body() createMessageDto: Partial<Message>) {
    try {
      const message = await this.messageService.create(createMessageDto);
      const generatedMessageId = message.messageId.toString();

      const user = await this.userService.findByLocationId(
        createMessageDto.locationId || '1',
      );

      if (user && user.ghlAuth && user.ghlAuth.access_token) {
        setTimeout(async () => {
          try {
            await axios({
              method: 'PUT',
              url: `https://services.leadconnectorhq.com/conversations/messages/${generatedMessageId}/status`,
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Version: '2021-04-15',
                Authorization: `Bearer ${user.ghlAuth!.access_token}`,
              },
              data: {
                status: 'delivered',
              },
            });
          } catch (ghlError) {
            console.error('Error actualizando status en GoHighLevel:', {
              messageId: generatedMessageId,
              status: ghlError.response?.status,
              statusText: ghlError.response?.statusText,
              error: ghlError.response?.data || ghlError.message,
              url: `https://services.leadconnectorhq.com/conversations/messages/${generatedMessageId}/status`,
              timestamp: new Date().toISOString(),
            });
          }
        }, 3000); 
      }

      return {
        status: 200,
        data: {
          userId: createMessageDto.userId,
          attachments: createMessageDto.attachments,
          contactId: createMessageDto.contactId,
          locationId: createMessageDto.locationId,
          messageId: generatedMessageId, 
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
