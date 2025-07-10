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
          console.log('=== DATOS PARA GHL REQUEST ===');
          console.log('MessageId:', createMessageDto.messageId);
          console.log('Token:', user.ghlAuth.access_token);

          const url = `https://services.leadconnectorhq.com/conversations/messages/${createMessageDto.messageId}/status`;
          console.log('URL completa:', url);

          const requestConfig = {
            method: 'PUT',
            url: url,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Version: '2021-04-15',
              Authorization: `Bearer ${user.ghlAuth.access_token}`,
            },
            data: {
              status: 'delivered',
            },
          };

          console.log('=== REQUEST CONFIG ===');
          console.log(JSON.stringify(requestConfig, null, 2));

          const ghlResponse = await axios(requestConfig);

          console.log('=== RESPUESTA GHL EXITOSA ===');
          console.log('Status:', ghlResponse.status);
          console.log('Data:', ghlResponse.data);
        } catch (ghlError) {
          console.error('=== ERROR EN GHL REQUEST ===');
          console.error('Status:', ghlError.response?.status);
          console.error('Status Text:', ghlError.response?.statusText);
          console.error('Response Data:', ghlError.response?.data);
          console.error('Headers enviados:', ghlError.config?.headers);
          console.error('URL:', ghlError.config?.url);
          console.error('Message:', ghlError.message);

          if (ghlError.response?.status === 403) {
            console.log('⚠️  ERROR 403: Forbidden - Posibles causas:');
            console.log('1. El messageId no existe en GHL');
            console.log('2. No tienes permisos para actualizar este mensaje');
            console.log('3. No hay proveedor de conversación configurado');

            if (
              ghlError.response?.data?.message?.includes(
                'No conversation provider found',
              )
            ) {
              console.log(
                '📝 CAUSA: No hay proveedor de conversación configurado en GHL',
              );
            }
          } else if (ghlError.response?.status === 404) {
            console.log('⚠️  ERROR 404: Mensaje no encontrado');
            console.log('📝 VERIFICAR: ¿El messageId existe en GoHighLevel?');
            console.log('📝 MessageId usado:', createMessageDto.messageId);
          } else if (ghlError.response?.status === 401) {
            console.log('⚠️  ERROR 401: Token inválido o expirado');
            console.log('📝 VERIFICAR: Token de autorización');
          }
        }
      } else {
        console.log('=== VERIFICACIÓN DE DATOS ===');
        console.log('User encontrado:', !!user);
        console.log('GhlAuth existe:', !!(user && user.ghlAuth));
        console.log(
          'Access token existe:',
          !!(user && user.ghlAuth && user.ghlAuth.access_token),
        );
        console.log('MessageId existe:', !!createMessageDto.messageId);
        console.log('LocationId usado:', createMessageDto.locationId);
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
