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

      // Normalizar y convertir attachments a {type, data: base64} si es archivo permitido
      let attachments: any[] = [];
      let base64Data = '';
      if (Array.isArray(createMessageDto.attachments) && createMessageDto.attachments.length > 0) {
        for (const att of createMessageDto.attachments) {
          let url = typeof att === 'string' ? att : att.data;
          const ext = extname(url || '').replace('.', '').toLowerCase();
          if (allowedExtensions.includes(ext)) {
            isFile = true;
            fileType = extensionToMime[ext] || 'application/octet-stream';
            // Descargar y convertir a base64
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            base64Data = Buffer.from(response.data).toString('base64');
            attachments.push({
              type: ext === 'jpg' || ext === 'jpeg' || ext === 'png' ? 'image' :
                    ext === 'mp3' || ext === 'wav' ? 'audio' :
                    ext === 'mp4' || ext === 'mpeg' ? 'video' :
                    ext === 'pdf' ? 'pdf' :
                    ext === 'doc' || ext === 'docx' ? 'word' :
                    ext === 'zip' || ext === 'rar' ? 'archive' :
                    ext === 'txt' ? 'text' : 'file',
              data: base64Data,
            });
          } else if (typeof att === 'object' && att.type && att.data) {
            attachments.push(att);
          }
        }
      }
      // Imprimir para depuración
      console.log('[DEBUG] attachments normalizados:', attachments);

      // Validar mensaje de texto si no es archivo
      if (!isFile) {
        if (!createMessageDto.message || createMessageDto.message.trim() === '') {
          throw new HttpException('El mensaje no puede estar vacío', HttpStatus.BAD_REQUEST);
        }
      }

      // Guardar el mensaje en la base de datos y enviar a Evolution
      if (isFile && attachments.length > 0) {
        // Guarda en Mongo el base64
        message = await this.messageService.create({
          ...createMessageDto,
          message: '',
          attachments,
          type: attachments[0].type,
        });
        // Enviar a Evolution el base64
        await this.evolutionService.sendMessageToEvolution(
          attachments[0].type,
          createMessageDto.phone,
          attachments[0].data,
          createMessageDto.userId,
        );
      } else if (Array.isArray(attachments) && attachments.length > 0 && typeof attachments[0] === 'object' && attachments[0] !== null && 'type' in attachments[0]) {
        // attachments ya normalizados arriba
        message = await this.messageService.create({
          ...createMessageDto,
          attachments,
          type: attachments[0].type || 'file',
        });
        await this.evolutionService.sendMessageToEvolution(
          attachments[0].type,
          createMessageDto.phone,
          attachments[0].data,
          createMessageDto.userId,
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
          createMessageDto.userId,
        );
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
