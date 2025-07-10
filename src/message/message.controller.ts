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

@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly userService: UserService,
  ) {}

  @Post()
  async create(@Body() createMessageDto: any) {
    try {
      console.log('Datos recibidos en el POST:', createMessageDto);

      const message = await this.messageService.create(createMessageDto);

      const user = await this.userService.findByLocationId(
        createMessageDto.locationId,
      );

      if (
        user &&
        user.ghlAuth &&
        user.ghlAuth.access_token &&
        createMessageDto.messageId
      ) {
        try {
          const ghlResponse = await axios({
            method: 'PUT',
            url: `https://services.leadconnectorhq.com/conversations/messages/${createMessageDto.messageId}/status`,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${user.ghlAuth.access_token}`,
            },
            data: {
              status: 'delivered',
              error: null,
              emailMessageId: createMessageDto.messageId,
              recipients: [createMessageDto.phone || 'unknown'],
            },
          });

          console.log('Status actualizado en GHL:', ghlResponse.data);
        } catch (ghlError) {
          console.error(
            'Error actualizando status en GHL:',
            ghlError.response?.data || ghlError.message,
          );
        }
      } else {
        console.log(
          'No se pudo obtener token GHL o messageId para actualizar status',
        );
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
