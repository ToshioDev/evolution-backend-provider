import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
  UseInterceptors,
  UploadedFile,
  Query,
  Get,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MessageService } from './message.service';
import { UserService } from '../user/user.service';
import { EvolutionService } from '../evolution/evolution.service';
import {
  MessagesResponseDto,
  MessageQueryDto,
} from './dto/message-response.dto';
import axios from 'axios';

@ApiTags('Messages')
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

      // Función para determinar el tipo de archivo basado en la extensión
      const getFileType = (url: string): string => {
        const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext))
          return 'image';
        if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) return 'audio';
        if (['mp4', 'mpeg', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext))
          return 'video';
        if (ext === 'pdf') return 'pdf';
        if (['doc', 'docx'].includes(ext)) return 'word';
        if (['xls', 'xlsx'].includes(ext)) return 'excel';
        if (['zip', 'rar'].includes(ext)) return 'archive';
        if (ext === 'txt') return 'text';
        return 'file';
      };

      // Verificar si el mensaje contiene archivos
      const hasAttachments =
        Array.isArray(createMessageDto.attachments) &&
        createMessageDto.attachments.length > 0;

      let isValidFile = false;
      let processedAttachments: any[] = [];
      let messageType = 'text';

      if (hasAttachments) {
        // Procesar attachments
        processedAttachments = createMessageDto.attachments.map((att: any) => {
          let url = '';
          let type = 'file';

          // Extraer URL del attachment
          if (typeof att === 'string') {
            url = att;
          } else if (typeof att === 'object' && att.data) {
            url = att.data;
            type = att.type || getFileType(url);
          } else if (typeof att === 'object' && att.url) {
            url = att.url;
            type = att.type || getFileType(url);
          }

          // Verificar si es un archivo válido
          const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
          const ext = extMatch ? extMatch[1].toLowerCase() : '';

          if (allowedExtensions.includes(ext)) {
            isValidFile = true;
            type = getFileType(url);
          }

          return { type, data: url };
        });

        messageType = processedAttachments[0]?.type || 'file';
      }

      console.log('[DEBUG] Processed attachments:', processedAttachments);
      console.log('[DEBUG] Is valid file:', isValidFile);
      console.log('[DEBUG] Message type:', messageType);

      // Validar que hay contenido (mensaje o archivo válido)
      if (
        !isValidFile &&
        (!createMessageDto.message || createMessageDto.message.trim() === '')
      ) {
        throw new HttpException(
          'El mensaje debe contener texto o un archivo válido',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Generar messageId si no existe
      const messageId =
        createMessageDto.messageId ||
        `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      // Preparar datos para guardar en MongoDB
      const messageData = {
        userId: createMessageDto.userId,
        contactId: createMessageDto.contactId,
        locationId: createMessageDto.locationId,
        conversationId: createMessageDto.conversationId,
        phone: createMessageDto.phone,
        messageId: messageId,
        typeMessage: 'OUTBOUND',
        type: messageType,
        message:
          createMessageDto.message || (isValidFile ? 'Archivo adjunto' : ''),
        attachments: processedAttachments,
      };

      // Guardar mensaje en MongoDB
      const message = await this.messageService.create(messageData);

      // Buscar usuario y enviar mensaje a Evolution
      const user = await this.userService.findByLocationId(
        createMessageDto.locationId || '1',
      );

      try {
        const remoteJid = (createMessageDto.phone || '').replace('+', '');
        const userId =
          user && (user as any)._id ? (user as any)._id.toString() : '';

        // Verificar si el mensaje es "[sticker]" para enviarlo como sticker
        if (
          createMessageDto.message &&
          createMessageDto.message.trim() === '[sticker]' &&
          isValidFile &&
          processedAttachments.length > 0
        ) {
          console.log(
            '[DEBUG] Detectado mensaje [sticker], enviando como sticker',
          );

          const firstAttachment = processedAttachments[0];
          await this.evolutionService.sendMessageToEvolution(
            'sticker',
            remoteJid,
            firstAttachment.data || '',
            userId,
          );
        } else if (isValidFile && processedAttachments.length > 0) {
          // Determinar tipo de Evolution basado en el tipo de archivo
          let evolutionType: 'image' | 'audio' | 'text' = 'text';
          const firstAttachment = processedAttachments[0];

          if (
            firstAttachment.type === 'image' ||
            firstAttachment.type === 'video'
          ) {
            evolutionType = 'image';
          } else if (firstAttachment.type === 'audio') {
            evolutionType = 'audio';
          } else {
            evolutionType = 'image'; // Para otros tipos de archivos, usar como imagen
          }

          await this.evolutionService.sendMessageToEvolution(
            evolutionType,
            remoteJid,
            firstAttachment.data || '',
            userId,
          );
        } else {
          // Enviar mensaje de texto
          await this.evolutionService.sendMessageToEvolution(
            'text',
            remoteJid,
            createMessageDto.message || '',
            userId,
          );
        }
      } catch (evoError: any) {
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
            processedAttachments.length > 0 ? processedAttachments : [],
          contactId: createMessageDto.contactId,
          locationId: createMessageDto.locationId,
          messageId: message.messageId,
          type: message.type,
          conversationId: createMessageDto.conversationId,
          phone: createMessageDto.phone,
          message:
            createMessageDto.message || (isValidFile ? 'Archivo adjunto' : ''),
        },
        savedMessage: message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('sent/:locationId')
  @ApiOperation({ summary: 'Obtener mensajes enviados por locationId' })
  @ApiParam({ name: 'locationId', description: 'ID de la ubicación' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Límite de mensajes por página',
    example: 20,
  })
  @ApiQuery({
    name: 'contactId',
    required: false,
    description: 'ID del contacto para filtrar',
  })
  @ApiQuery({
    name: 'conversationId',
    required: false,
    description: 'ID de la conversación para filtrar',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensajes enviados obtenidos exitosamente',
    type: MessagesResponseDto,
  })
  async getSentMessages(
    @Param('locationId') locationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('contactId') contactId?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      const result = await this.messageService.findSentMessages(
        locationId,
        pageNum,
        limitNum,
        contactId,
        conversationId,
      );

      return {
        status: 200,
        data: {
          messages: result.messages,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: result.total,
            totalPages: Math.ceil(result.total / limitNum),
          },
        },
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('received/:locationId')
  @ApiOperation({ summary: 'Obtener mensajes recibidos por locationId' })
  @ApiParam({ name: 'locationId', description: 'ID de la ubicación' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Límite de mensajes por página',
    example: 20,
  })
  @ApiQuery({
    name: 'contactId',
    required: false,
    description: 'ID del contacto para filtrar',
  })
  @ApiQuery({
    name: 'conversationId',
    required: false,
    description: 'ID de la conversación para filtrar',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensajes recibidos obtenidos exitosamente',
    type: MessagesResponseDto,
  })
  async getReceivedMessages(
    @Param('locationId') locationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('contactId') contactId?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      const result = await this.messageService.findReceivedMessages(
        locationId,
        pageNum,
        limitNum,
        contactId,
        conversationId,
      );

      return {
        status: 200,
        data: {
          messages: result.messages,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: result.total,
            totalPages: Math.ceil(result.total / limitNum),
          },
        },
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('conversation/:locationId/:conversationId')
  @ApiOperation({
    summary: 'Obtener todos los mensajes de una conversación específica',
  })
  @ApiParam({ name: 'locationId', description: 'ID de la ubicación' })
  @ApiParam({ name: 'conversationId', description: 'ID de la conversación' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Límite de mensajes por página',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Mensajes de la conversación obtenidos exitosamente',
    type: MessagesResponseDto,
  })
  async getConversationMessages(
    @Param('locationId') locationId: string,
    @Param('conversationId') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      const result = await this.messageService.findConversationMessages(
        locationId,
        conversationId,
        pageNum,
        limitNum,
      );

      return {
        status: 200,
        data: {
          messages: result.messages,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: result.total,
            totalPages: Math.ceil(result.total / limitNum),
          },
        },
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('contact/:locationId/:contactId')
  @ApiOperation({
    summary: 'Obtener todos los mensajes de un contacto específico',
  })
  @ApiParam({ name: 'locationId', description: 'ID de la ubicación' })
  @ApiParam({ name: 'contactId', description: 'ID del contacto' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Límite de mensajes por página',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Mensajes del contacto obtenidos exitosamente',
    type: MessagesResponseDto,
  })
  async getContactMessages(
    @Param('locationId') locationId: string,
    @Param('contactId') contactId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      const result = await this.messageService.findContactMessages(
        locationId,
        contactId,
        pageNum,
        limitNum,
      );

      return {
        status: 200,
        data: {
          messages: result.messages,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: result.total,
            totalPages: Math.ceil(result.total / limitNum),
          },
        },
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
