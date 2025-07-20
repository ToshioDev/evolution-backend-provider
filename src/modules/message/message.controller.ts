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
      let isFile = false;
      let fileType = '';
      let fileAttachment: any = null;
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
      const extensionToMime: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        mp4: 'video/mp4',
        mpeg: 'video/mpeg',
        zip: 'application/zip',
        rar: 'application/vnd.rar',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
      };

      // Procesar attachments: solo archivos permitidos, subir a GoHighLevel y guardar link y type correcto
      let attachments: any[] = [];
      if (
        Array.isArray(createMessageDto.attachments) &&
        createMessageDto.attachments.length > 0
      ) {
        for (const att of createMessageDto.attachments) {
          let url = att;
          let fileBuffer: Buffer | null = null;
          let fileName = 'archivo';
          // Si viene como objeto tipo multer
          if (typeof att === 'object' && att.buffer) {
            fileBuffer = att.buffer;
            fileName = att.originalname || att.filename || 'archivo';
            url = att.originalname || att.filename || '';
          } else if (typeof att === 'object' && att.base64) {
            fileBuffer = Buffer.from(att.base64, 'base64');
            fileName = att.originalname || att.filename || 'archivo';
            url = att.originalname || att.filename || '';
          } else if (typeof att === 'object' && att.data) {
            url = att.data;
          }
          // Si es string, es url
          if (typeof url === 'string' && !fileBuffer) {
            // Descargar el archivo
            try {
              const response = await axios.get(url, {
                responseType: 'arraybuffer',
              });
              fileBuffer = Buffer.from(response.data);
              fileName = url.split('/').pop() || 'archivo';
            } catch (err) {
              throw new HttpException(
                'No se pudo descargar el archivo: ' + url,
                HttpStatus.BAD_REQUEST,
              );
            }
          }
          // Validar extensión
          const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
          const ext = extMatch ? extMatch[1].toLowerCase() : '';
          if (!allowedExtensions.includes(ext)) {
            throw new HttpException(
              'Tipo de archivo no permitido: ' + ext,
              HttpStatus.BAD_REQUEST,
            );
          }
          isFile = true;
          // Subir a GoHighLevel
          const FormData = require('form-data');
          const form = new FormData();
          form.append('fileAttachment', fileBuffer, fileName);
          form.append('conversationId', createMessageDto.conversationId || '');
          form.append('locationId', createMessageDto.locationId || '');
          // Buscar token de GoHighLevel
          const user = await this.userService.findByLocationId(
            createMessageDto.locationId || '1',
          );
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
          // Determinar type simple para front
          let type = 'file';
          if (['jpg', 'jpeg', 'png'].includes(ext)) type = 'image';
          else if (['mp3', 'wav'].includes(ext)) type = 'audio';
          else if (['mp4', 'mpeg'].includes(ext)) type = 'video';
          else if (ext === 'pdf') type = 'pdf';
          else if (['doc', 'docx'].includes(ext)) type = 'word';
          else if (['zip', 'rar'].includes(ext)) type = 'archive';
          else if (ext === 'txt') type = 'text';
          attachments.push({ type, data: attachmentUrls[0] });
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

      // Guardar el mensaje en la base de datos
      if (isFile && attachments.length > 0) {
        // Asegurar que messageId esté presente
        const mongoMessageId =
          createMessageDto.messageId ||
          `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        message = await this.messageService.create({
          ...createMessageDto,
          message: attachments[0].data.split('/').pop() || 'archivo',
          attachments,
          type: attachments[0].type,
          messageId: mongoMessageId,
        });
        uploadedAttachment = attachments[0];
      } else {
        // Mensaje de texto normal
        message = await this.messageService.create({
          ...createMessageDto,
          type: 'text',
        });
      }

      // Buscar usuario y enviar mensaje a Evolution
      const user = await this.userService.findByLocationId(
        createMessageDto.locationId || '1',
      );
      try {
        const remoteJid = (createMessageDto.phone || '').replace('+', '');
        const userId =
          user && (user as any)._id ? (user as any)._id.toString() : '';
        if (isFile) {
          let evolutionType: 'image' | 'audio' | 'text' = 'text';
          if (fileType.startsWith('image')) evolutionType = 'image';
          else if (fileType.startsWith('audio')) evolutionType = 'audio';
          else if (fileType.startsWith('video')) evolutionType = 'image';
          else evolutionType = 'image';
          await this.evolutionService.sendMessageToEvolution(
            evolutionType,
            remoteJid,
            uploadedAttachment?.data || '',
            userId,
          );
        } else {
          await this.evolutionService.sendMessageToEvolution(
            'text',
            remoteJid,
            createMessageDto.message || '',
            userId,
          );
        }
      } catch (evoError) {
        console.error(
          '[ERROR] Error sending message via EvolutionService:',
          'MessageController',
          evoError.message,
        );
      }

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
