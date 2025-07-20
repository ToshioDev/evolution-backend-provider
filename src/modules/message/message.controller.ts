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

      // Normalizar y limpiar attachments: solo archivos permitidos, type y data correctos
      let attachments: any[] = [];
      if (
        Array.isArray(createMessageDto.attachments) &&
        createMessageDto.attachments.length > 0
      ) {
        for (const att of createMessageDto.attachments) {
          let url = att;
          let fileBuffer: Buffer | null = null;
          let fileName = 'archivo';
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
          if (typeof url === 'string' && !fileBuffer) {
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
          // Determinar type simple para front y Evolution
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
      // Imprimir para depuración
      console.log(
        '[DEBUG] attachments normalizados:',
        createMessageDto.attachments,
      );

      // fileType para Evolution
      let fileTypeForEvolution = '';
      if (isFile && attachments.length > 0) {
        fileTypeForEvolution = attachments[0].type;
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
      if (isFile && attachments.length > 0) {
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
        message = await this.messageService.create({
          ...createMessageDto,
          attachments: [],
          type: 'text',
        });
        uploadedAttachment = null;
      }

      // Buscar usuario y enviar mensaje a Evolution
      const user = await this.userService.findByLocationId(
        createMessageDto.locationId || '1',
      );
      try {
        const remoteJid = (createMessageDto.phone || '').replace('+', '');
        const userId = user && user._id ? user.id.toString() : '';
        if (
          isFile &&
          uploadedAttachment &&
          uploadedAttachment.type &&
          uploadedAttachment.data
        ) {
          // Solo image/audio/text para Evolution
          let evolutionType: 'image' | 'audio' | 'text' = 'text';
          if (uploadedAttachment.type === 'image') evolutionType = 'image';
          else if (uploadedAttachment.type === 'audio') evolutionType = 'audio';
          else evolutionType = 'text';
          try {
            await this.evolutionService.sendMessageToEvolution(
              evolutionType,
              remoteJid,
              uploadedAttachment.data,
              userId,
            );
          } catch (evoError) {
            console.error(
              '[ERROR] Error sending message via EvolutionService:',
              'MessageController',
              evoError.message,
            );
          }
        } else {
          try {
            await this.evolutionService.sendMessageToEvolution(
              'text',
              remoteJid,
              createMessageDto.message || '',
              userId,
            );
          } catch (evoError) {
            console.error(
              '[ERROR] Error sending message via EvolutionService:',
              'MessageController',
              evoError.message,
            );
          }
        }
      } catch (evoError) {
        console.error(
          '[ERROR] Error preparando datos para EvolutionService:',
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
