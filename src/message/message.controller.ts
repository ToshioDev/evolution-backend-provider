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
  async create(@Body() body: { data: any }) {
    try {
        
      const dataToSave = {
        userId: body.data.userId || null,
        attachments: body.data.attachments || [],
        contactId: body.data.contactId || null,
        locationId: body.data.locationId || null,
        messageId: body.data.messageId || null,
        type: body.data.type || null,
        conversationId: body.data.conversationId || null,
        phone: body.data.phone || null,
        message: body.data.message || null,
        originalData: body.data, 
        timestamp: new Date().toISOString(),
      };

      const message = await this.messageService.create({
        data: dataToSave,
        receivedData: body.data,
      });

      return {
        data: dataToSave,
        savedMessage: message,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
