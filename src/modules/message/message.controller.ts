import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { UserService } from '../user/user.service';
import { EvolutionService } from '../evolution/evolution.service';
import axios from 'axios';
import { Message } from './message.schema';
import { LoggerService } from '../../common/services/logger.service';

@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly userService: UserService,
    private readonly evolutionService: EvolutionService,
    private readonly logger: LoggerService,
  ) {}

  @Get(':locationId')
  async getMessagesByLocationId(
    @Param('locationId') locationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    try {
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
      const { messages, total } = await this.messageService.findByLocationId(
        locationId,
        pageNum,
        limitNum,
      );
      return {
        status: 200,
        data: messages,
        total,
        page: pageNum,
        limit: limitNum,
        locationId,
        totalPages: Math.ceil(total / limitNum),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post()
  async create(@Body() createMessageDto: Partial<Message>) {
    this.messageService.logIncomingMessageBody(createMessageDto);
    try {
      // Validar si es archivo adjunto (imagen, audio, pdf, documento, etc.)
      let isFile = false;
      let fileType = '';
      let fileAttachment: any = null;
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ];

      // Si viene attachments y es un array, validar el tipo
      if (
        Array.isArray(createMessageDto.attachments) &&
        createMessageDto.attachments.length > 0
      ) {
        fileAttachment = createMessageDto.attachments[0];
        if (
          fileAttachment &&
          fileAttachment.mimetype &&
          allowedMimeTypes.includes(fileAttachment.mimetype)
        ) {
          isFile = true;
          fileType = fileAttachment.mimetype;
        } else if (fileAttachment && fileAttachment.url) {
          // Si solo viene url, intentar deducir por extensión
          const url = fileAttachment.url;
          if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            isFile = true;
            fileType = 'image';
          } else if (url.match(/\.(mp3|wav|ogg)$/i)) {
            isFile = true;
            fileType = 'audio';
          } else if (url.match(/\.(pdf)$/i)) {
            isFile = true;
            fileType = 'pdf';
          } else if (url.match(/\.(doc|docx)$/i)) {
            isFile = true;
            fileType = 'word';
          } else if (url.match(/\.(xls|xlsx)$/i)) {
            isFile = true;
            fileType = 'excel';
          } else if (url.match(/\.(ppt|pptx)$/i)) {
            isFile = true;
            fileType = 'powerpoint';
          }
        }
      }

      // Si no es archivo, validar mensaje de texto
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
      let message;
      let uploadedAttachment: any = null;
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
          this.logger.error(
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
          originalname:
            fileAttachment.originalname || fileAttachment.filename || 'archivo',
          filename:
            fileAttachment.filename || fileAttachment.originalname || 'archivo',
          mimetype: fileAttachment.mimetype || '',
          url: attachmentUrls[0] || '',
        };
        // Definir el tipo de mensaje para Mongo
        let mongoType = 'file';
        if (fileType.startsWith('image')) mongoType = 'image';
        else if (fileType.startsWith('audio')) mongoType = 'audio';
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
          fileType.startsWith('application/vnd.ms-powerpoint') ||
          fileType.startsWith(
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          )
        )
          mongoType = 'powerpoint';

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
      } else {
        // Mensaje de texto normal
        message = await this.messageService.create({
          ...createMessageDto,
          type: 'text',
        });
      }
      const generatedMessageId = message.messageId?.toString() || '';

      // Buscar usuario
      const user = await this.userService.findByLocationId(
        createMessageDto.locationId || '1',
      );

      // Enviar mensaje a Evolution según tipo
      try {
        const remoteJid = (createMessageDto.phone || '').replace('+', '');
        const userId =
          user && (user as any)._id ? (user as any)._id.toString() : '';
        if (isFile) {
          // Lógica para enviar archivo a Evolution
          let evolutionType: 'image' | 'audio' | 'text' = 'text';
          if (fileType.startsWith('image')) {
            evolutionType = 'image';
          } else if (fileType.startsWith('audio')) {
            evolutionType = 'audio';
          } else {
            // Si no es imagen ni audio, lo tratamos como imagen por defecto (ajustar según lógica de EvolutionService)
            evolutionType = 'image';
          }
          await this.evolutionService.sendMessageToEvolution(
            evolutionType,
            remoteJid,
            fileAttachment?.url ||
              fileAttachment?.path ||
              fileAttachment?.filename ||
              '',
            userId,
          );
        } else {
          // Mensaje de texto
          await this.evolutionService.sendMessageToEvolution(
            'text',
            remoteJid,
            createMessageDto.message || '',
            userId,
          );
        }
      } catch (evoError) {
        this.logger.error(
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
              url: `https://services.leadconnectorhq.com/conversations/messages/${generatedMessageId}/status`,
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
            this.logger.error(
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
              ? uploadedAttachment.originalname ||
                uploadedAttachment.filename ||
                uploadedAttachment.url ||
                'archivo'
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
