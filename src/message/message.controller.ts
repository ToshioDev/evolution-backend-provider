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
      console.log('Datos recibidos en el POST:', body);
      console.log('Contenido de data:', body.data);

      const message = await this.messageService.create({
        ...body.data,
        receivedData: body.data, 
      });

      return {
        status: 'success',
        message: 'Mensaje creado exitosamente',
        data: message,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
