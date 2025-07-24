import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MessageService } from './message.service';

@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    @InjectQueue('message-queue') private readonly messageQueue: Queue,
  ) {}

  @Post()
  async create(@Body() createMessageDto: any) {
    try {
      await this.messageQueue.add('send-message', createMessageDto);
      return {
        status: 202,
        message: 'Mensaje encolado para procesamiento asíncrono',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
