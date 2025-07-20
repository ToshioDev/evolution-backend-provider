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

      // Normalizar attachments: siempre debe ser array de objetos {type, data}
      if (
        Array.isArray(createMessageDto.attachments) &&
        createMessageDto.attachments.length > 0
      ) {
        createMessageDto.attachments = createMessageDto.attachments.map(
          (att: any) => {
            let url = att;
            if (typeof att === 'object' && att.data) url = att.data;
            if (typeof att === 'object' && att.type && att.data) return att;
            const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
            const ext = extMatch ? extMatch[1].toLowerCase() : '';
            // type simple para front: image, audio, video, pdf, word, excel, archive, text, file
            let type = 'file';
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext))
              type = 'image';
            else if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) type = 'audio';
            else if (
              ['mp4', 'mpeg', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)
            )
              type = 'video';
            else if (ext === 'pdf') type = 'pdf';
            else if (['doc', 'docx'].includes(ext)) type = 'word';
            else if (['xls', 'xlsx'].includes(ext)) type = 'excel';
            else if (['zip', 'rar'].includes(ext)) type = 'archive';
            else if (ext === 'txt') type = 'text';
            return { type, data: url };
          },
        );
      }
      // Imprimir para depuración
      console.log(
        '[DEBUG] attachments normalizados:',
        createMessageDto.attachments,
      );

      // Detectar si es archivo válido
      if (
        Array.isArray(createMessageDto.attachments) &&
        createMessageDto.attachments.length > 0
      ) {
        fileAttachment = createMessageDto.attachments[0];
        if (fileAttachment && fileAttachment.mimetype) {
          const ext = Object.keys(extensionToMime).find(
            (key) => extensionToMime[key] === fileAttachment.mimetype,
          );
          if (ext && allowedExtensions.includes(ext)) {
            isFile = true;
            fileType = fileAttachment.mimetype;
          }
        } else if (fileAttachment && fileAttachment.data) {
          const url = fileAttachment.data;
          const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
          const ext = extMatch ? extMatch[1].toLowerCase() : '';
          if (allowedExtensions.includes(ext)) {
            isFile = true;
            fileType = extensionToMime[ext] || 'application/octet-stream';
          }
        }
      }

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
      if (isFile) {
        // Subir archivo a GoHighLevel y guardar la URL
        const FormData = require('form-data');
        const form = new FormData();
        let fileBuffer = fileAttachment.buffer;
        let fileName =
          fileAttachment.originalname || fileAttachment.filename || 'archivo';
        if (!fileBuffer && fileAttachment.base64) {
          fileBuffer = Buffer.from(fileAttachment.base64, 'base64');
        }
        form.append('fileAttachment', fileBuffer, fileName);
        form.append('conversationId', createMessageDto.conversationId || '');
        form.append('locationId', createMessageDto.locationId || '');

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
        // type simple para front
        let ext = '';
        if (attachmentUrls[0]) {
          const extMatch = attachmentUrls[0].match(/\.([a-zA-Z0-9]+)$/);
          ext = extMatch ? extMatch[1].toLowerCase() : '';
        }
        let type = 'file';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext))
          type = 'image';
        else if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) type = 'audio';
        else if (
          ['mp4', 'mpeg', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)
        )
          type = 'video';
        else if (ext === 'pdf') type = 'pdf';
        else if (['doc', 'docx'].includes(ext)) type = 'word';
        else if (['xls', 'xlsx'].includes(ext)) type = 'excel';
        else if (['zip', 'rar'].includes(ext)) type = 'archive';
        else if (ext === 'txt') type = 'text';

        uploadedAttachment = {
          type,
          data: attachmentUrls[0] || '',
        };
        // Definir el tipo de mensaje para Mongo
        let mongoType = type;

        // Asegurar que messageId esté presente
        const mongoMessageId =
          createMessageDto.messageId ||
          `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        message = await this.messageService.create({
          ...createMessageDto,
          message: fileName,
          attachments: [uploadedAttachment],
          type: mongoType,
          messageId: mongoMessageId,
        });
      } else if (
        Array.isArray(createMessageDto.attachments) &&
        createMessageDto.attachments.length > 0 &&
        typeof createMessageDto.attachments[0] === 'object' &&
        createMessageDto.attachments[0] !== null &&
        'type' in createMessageDto.attachments[0]
      ) {
        // attachments ya normalizados arriba
        message = await this.messageService.create({
          ...createMessageDto,
          attachments: createMessageDto.attachments,
          type: createMessageDto.attachments[0].type || 'file',
        });
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
