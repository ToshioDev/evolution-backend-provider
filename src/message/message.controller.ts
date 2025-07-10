import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { UserService } from '../user/user.service';

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
          console.log(
            'URL completa:',
            `https://services.leadconnectorhq.com/conversations/messages/${createMessageDto.messageId}/status`,
          );

          const requestConfig = {
            method: 'PUT',
            url: `https://services.leadconnectorhq.com/conversations/messages/${createMessageDto.messageId}/status`,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Version: '2021-04-15',
              Authorization: `Bearer ${user.ghlAuth.access_token}`,
            },
            body: JSON.stringify({
              status: 'delivered',
            }),
          };

          console.log('=== REQUEST CONFIG ===');
          console.log(JSON.stringify(requestConfig, null, 2));

          const ghlResponse = await fetch(requestConfig.url, {
            method: requestConfig.method,
            headers: requestConfig.headers,
            body: requestConfig.body,
          });

          console.log('=== RESPUESTA GHL ===');
          console.log('Status:', ghlResponse.status);
          console.log('Status Text:', ghlResponse.statusText);

          if (ghlResponse.ok) {
            const responseData = await ghlResponse.json();
            console.log('=== RESPUESTA GHL EXITOSA ===');
            console.log('Data:', responseData);
          } else {
            const errorData = await ghlResponse.json();
            throw new Error(
              `HTTP ${ghlResponse.status}: ${JSON.stringify(errorData)}`,
            );
          }
        } catch (ghlError) {
          console.error('=== ERROR EN GHL REQUEST ===');
          console.error('Error completo:', ghlError);

          if (ghlError.message && ghlError.message.includes('HTTP')) {
            console.error('Error HTTP:', ghlError.message);

            if (
              ghlError.message.includes('403') &&
              ghlError.message.includes('No conversation provider found')
            ) {
              console.log(
                '⚠️  ADVERTENCIA: GoHighLevel no tiene configurado un proveedor de conversación para este mensaje',
              );
              console.log(
                '📝 SUGERENCIA: Verifica la configuración de proveedores SMS/WhatsApp en tu cuenta de GHL',
              );
            }
          } else {
            console.error('Error de red o conexión:', ghlError.message);
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
