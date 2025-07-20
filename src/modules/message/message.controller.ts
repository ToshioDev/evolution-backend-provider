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
        } else if (
          fileAttachment &&
          (fileAttachment.url || typeof fileAttachment === 'string')
        ) {
          const url = fileAttachment.url || fileAttachment;
          const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
          const ext = extMatch ? extMatch[1].toLowerCase() : '';
          if (allowedExtensions.includes(ext)) {
            isFile = true;
            fileType = extensionToMime[ext] || 'application/octet-stream';
            isFile = true;
            fileType = extensionToMime[ext] || 'application/octet-stream';
          }
        }
      }

      // Si attachments es array de strings (URLs), transformarlas a objetos tipo { type, data }
      if (
        Array.isArray(createMessageDto.attachments) &&
        typeof createMessageDto.attachments[0] === 'string'
      ) {
        createMessageDto.attachments = createMessageDto.attachments.map(
          (url: string) => {
            const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
            const ext = extMatch ? extMatch[1].toLowerCase() : '';
            return {
              type: extensionToMime[ext] || 'application/octet-stream',
              data: url,
            };
          },
        );
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
        uploadedAttachment = {
          type: fileType,
          data: attachmentUrls[0] || '',
        };
        // Definir el tipo de mensaje para Mongo
        let mongoType = 'file';
        if (fileType.startsWith('image')) mongoType = 'image';
        else if (fileType.startsWith('audio')) mongoType = 'audio';
        else if (fileType.startsWith('video')) mongoType = 'video';
        else if (fileType.startsWith('application/pdf')) mongoType = 'pdf';
        else if (
          fileType.startsWith('application/msword') ||
          fileType.startsWith(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          )
        )
          mongoType = 'word';
        else if (
          fileType.startsWith('application/vnd.ms-excel') ||
          fileType.startsWith(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          )
        )
          mongoType = 'excel';
        else if (
          fileType.startsWith('application/zip') ||
          fileType.startsWith('application/vnd.rar')
        )
          mongoType = 'archive';
        else if (fileType.startsWith('text/plain')) mongoType = 'text';

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
        createMessageDto.attachments.length > 0
      ) {
        // Si attachments ya viene como objetos, asegurarse que solo tengan type y data correctos
        const normalizedAttachments = createMessageDto.attachments.map(
          (att: any) => {
            let type = att.type;
            let data = att.data;
            if (!type && data) {
              const extMatch = data.match(/\.([a-zA-Z0-9]+)$/);
              const ext = extMatch ? extMatch[1].toLowerCase() : '';
              type = extensionToMime[ext] || 'application/octet-stream';
            }
            return { type, data };
          },
        );
        message = await this.messageService.create({
          ...createMessageDto,
          attachments: normalizedAttachments,
          type: 'file',
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
