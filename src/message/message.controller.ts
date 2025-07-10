import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { MessageService } from './message.service';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async create(@Body() createMessageDto: any) {
    try {
      const message = await this.messageService.create(createMessageDto);
      return {
        status: 'success',
        message: 'Mensaje creado exitosamente',
        data: message,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll() {
    try {
      const messages = await this.messageService.findAll();
      return {
        status: 'success',
        message: 'Mensajes obtenidos exitosamente',
        data: messages,
        total: messages.length,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const message = await this.messageService.findOne(id);
      return {
        status: 'success',
        message: 'Mensaje encontrado exitosamente',
        data: message,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateMessageDto: any) {
    try {
      const message = await this.messageService.update(id, updateMessageDto);
      return {
        status: 'success',
        message: 'Mensaje actualizado exitosamente',
        data: message,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.messageService.remove(id);
      return {
        status: 'success',
        message: 'Mensaje eliminado exitosamente',
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('location/:locationId')
  async findByLocation(@Param('locationId') locationId: string) {
    try {
      const messages = await this.messageService.findAll();
      const filteredMessages = messages.filter(
        (msg) => msg.locationId === locationId,
      );
      return {
        status: 'success',
        message: 'Mensajes por ubicación obtenidos exitosamente',
        data: filteredMessages,
        total: filteredMessages.length,
        locationId,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

}
