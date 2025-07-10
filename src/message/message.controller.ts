import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { MessageService } from './message.service';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async create(@Body() createMessageDto: any) {
    try {
      console.log('Datos recibidos en el POST:', createMessageDto);

      const message = await this.messageService.create(createMessageDto);

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
