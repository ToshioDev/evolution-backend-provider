import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { UserService } from '../user/user.service';
import { EvolutionService } from '../evolution/evolution.service';
import axios from 'axios';
import { extname } from 'path';
import { Types } from 'mongoose';

@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly userService: UserService,
    private readonly evolutionService: EvolutionService,
  ) {}

  @Post()
  async create(@Body() createMessageDto: any) {
    this.messageService.logIncomingMessageBody(createMessageDto);
    try {
      // Normalizar userId a ObjectId si es posible
      let userId = createMessageDto.userId;
      let user: any = null;
      if (userId && Types.ObjectId.isValid(userId)) {
        user = await this.userService.findById(userId);
      } else if (createMessageDto.locationId) {
        user = await this.userService.findByLocationId(
          createMessageDto.locationId,
        );
        if (user && user._id) userId = user._id.toString();
      }
      if (!user) {
        throw new HttpException(
          'Usuario no encontrado para userId o locationId',
          HttpStatus.BAD_REQUEST,
        );
      }
      let isFile = false;
      let fileType = '';
      let uploadedAttachment: any = null;
      let message;
      const allowedExtensions = [
        'jpg',
        'jpeg',
        'png',
        'mp4',
        'mpeg',
        'zip',
        'rar',
        'pdf',
        'doc',
        'docx',
        'txt',
        'mp3',
        'wav',
      ];
      const extensionToType: Record<string, string> = {
        jpg: 'image',
        jpeg: 'image',
        png: 'image',
        mp4: 'video',
        mpeg: 'video',
        zip: 'archive',
        rar: 'archive',
        pdf: 'pdf',
        doc: 'word',
        docx: 'word',
        txt: 'text',
        mp3: 'audio',
        wav: 'audio',
      };

      // Validar y subir archivos permitidos a GoHighLevel, guardar el link y type
      let attachments: any[] = [];
      if (
        Array.isArray(createMessageDto.attachments) &&
        createMessageDto.attachments.length > 0
      ) {
        for (const att of createMessageDto.attachments) {
          let url = typeof att === 'string' ? att : att.data;
          const ext = extname(url || '')
            .replace('.', '')
            .toLowerCase();
          if (!allowedExtensions.includes(ext)) {
            throw new HttpException(
              'Tipo de archivo no permitido: ' + ext,
              HttpStatus.BAD_REQUEST,
            );
          }
          isFile = true;
          fileType = extensionToType[ext] || 'file';
          // Descargar el archivo como buffer
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
          });
          const fileBuffer = Buffer.from(response.data);
          // Subir a GoHighLevel
          const FormData = require('form-data');
          const form = new FormData();
          form.append('fileAttachment', fileBuffer, 'archivo.' + ext);
          form.append('conversationId', createMessageDto.conversationId || '');
          form.append('locationId', createMessageDto.locationId || '');
          const accessToken = user?.ghlAuth?.access_token;
          if (!accessToken) {
            throw new HttpException(
              'No se encontró el token de GoHighLevel para este usuario',
              HttpStatus.UNAUTHORIZED,
            );
          }
          let uploadResponse;
          try {
            uploadResponse = await axios.post(
              'https://services.leadconnectorhq.com/conversations/messages/upload',
              form,
              {
                headers: {
                  ...form.getHeaders(),
                  Accept: 'application/json',
                  Version: '2021-04-15',
                  Authorization: `Bearer ${accessToken}`,
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
              },
            );
          } catch (uploadError) {
            console.error(
              'Error subiendo archivo a GoHighLevel:',
              'MessageController',
              uploadError.message,
            );
            throw new HttpException(
              'Error subiendo archivo a GoHighLevel: ' + uploadError.message,
              HttpStatus.BAD_REQUEST,
            );
          }
          const attachmentUrls = uploadResponse?.data?.attachmentUrls || [];
          if (!attachmentUrls[0]) {
            throw new HttpException(
              'No se obtuvo URL de GoHighLevel',
              HttpStatus.BAD_REQUEST,
            );
          }
          attachments.push({
            type: fileType,
            data: attachmentUrls[0],
          });
        }
      }
      // Imprimir para depuración
      console.log('[DEBUG] attachments normalizados:', attachments);

      // Validar mensaje de texto si no es archivo
      if (!isFile) {
        if (
          !createMessageDto.message ||
          createMessageDto.message.trim() === ''
        ) {
          throw new HttpException(
            'El mensaje no puede estar vacío',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Guardar el mensaje en la base de datos y enviar a Evolution
      if (isFile && attachments.length > 0) {
        // Guarda en Mongo el link y type
        message = await this.messageService.create({
          ...createMessageDto,
          message: '',
          attachments,
          type: attachments[0].type,
        });
        // Enviar a Evolution el link (no base64)
        await this.evolutionService.sendMessageToEvolution(
          attachments[0].type,
          createMessageDto.phone,
          attachments[0].data,
          userId,
        );
      } else {
        // Mensaje de texto normal
        message = await this.messageService.create({
          ...createMessageDto,
          type: 'text',
        });
        await this.evolutionService.sendMessageToEvolution(
          'text',
          createMessageDto.phone,
          createMessageDto.message,
          userId,
        );
      }

      // Ya no se hace doble envío a Evolution ni doble búsqueda de usuario

      // Actualizar status en GoHighLevel si corresponde
      if (user && user.ghlAuth && user.ghlAuth.access_token) {
        setTimeout(async () => {
          try {
            await axios({
              method: 'PUT',
              url: `https://services.leadconnectorhq.com/conversations/messages/${message.messageId}/status`,
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
            console.error(
              'Error actualizando status en GoHighLevel:',
              'MessageController',
              ghlError.message,
            );
          }
        }, 3000);
      }

      return {
        status: 200,
        data: {
          userId: createMessageDto.userId,
          attachments:
            isFile && uploadedAttachment
              ? [uploadedAttachment]
              : createMessageDto.attachments,
          contactId: createMessageDto.contactId,
          locationId: createMessageDto.locationId,
          messageId: message.messageId,
          type: message.type,
          conversationId: createMessageDto.conversationId,
          phone: createMessageDto.phone,
          message:
            isFile && uploadedAttachment
              ? uploadedAttachment.data
              : createMessageDto.message,
        },
        savedMessage: message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
