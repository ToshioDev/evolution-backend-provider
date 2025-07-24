import { Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.schema';
import { LoggerService, ConfigurationService } from '../../common';
import { UserService } from '../user/user.service';
import { EvolutionService } from '../evolution/evolution.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigurationService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => EvolutionService))
    private readonly evolutionService: EvolutionService,
  ) {
    // Validar configuración del módulo Message al inicializar
    this.configService.logModuleConfig('message');
  }

  logIncomingMessageBody(body: Partial<Message>): void {
    this.loggerService.debug(
      '[POST /message] Body recibido',
      'MessageService',
      body,
    );
  }

  /**
   * Procesa y envía un mensaje (lógica para worker y para pruebas directas)
   */
  async processAndSendMessage(createMessageDto: any): Promise<void> {
    this.logIncomingMessageBody(createMessageDto);

    const allowedExtensions = [
      'jpg', 'jpeg', 'png', 'mp4', 'mpeg', 'zip', 'rar', 'pdf', 'doc', 'docx', 'txt', 'mp3', 'wav',
    ];

    const getFileType = (url: string): string => {
      const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : '';
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
      if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) return 'audio';
      if (['mp4', 'mpeg', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) return 'video';
      if (ext === 'pdf') return 'pdf';
      if (['doc', 'docx'].includes(ext)) return 'word';
      if (['xls', 'xlsx'].includes(ext)) return 'excel';
      if (['zip', 'rar'].includes(ext)) return 'archive';
      if (ext === 'txt') return 'text';
      return 'file';
    };

    const hasAttachments = Array.isArray(createMessageDto.attachments) && createMessageDto.attachments.length > 0;
    let isValidFile = false;
    let processedAttachments: any[] = [];
    let messageType = 'text';

    if (hasAttachments) {
      processedAttachments = createMessageDto.attachments.map((att: any) => {
        let url = '';
        let type = 'file';
        if (typeof att === 'string') {
          url = att;
        } else if (typeof att === 'object' && att.data) {
          url = att.data;
          type = att.type || getFileType(url);
        } else if (typeof att === 'object' && att.url) {
          url = att.url;
          type = att.type || getFileType(url);
        }
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

    if (
      !isValidFile &&
      (!createMessageDto.message || createMessageDto.message.trim() === '')
    ) {
      throw new HttpException(
        'El mensaje debe contener texto o un archivo válido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const messageId =
      createMessageDto.messageId ||
      `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const messageData = {
      userId: createMessageDto.userId,
      contactId: createMessageDto.contactId,
      locationId: createMessageDto.locationId,
      conversationId: createMessageDto.conversationId,
      phone: createMessageDto.phone,
      messageId: messageId,
      typeMessage: 'OUTBOUND',
      type: messageType,
      message: createMessageDto.message || (isValidFile ? 'Archivo adjunto' : ''),
      attachments: processedAttachments,
    };

    // Guardar mensaje en MongoDB
    const message = await this.create(messageData);

    // Buscar usuario y enviar mensaje a Evolution
    const user = await this.userService.findByLocationId(
      createMessageDto.locationId || '1',
    );

    try {
      const remoteJid = (createMessageDto.phone || '').replace('+', '');
      const userId =
        user && (user as any)._id ? (user as any)._id.toString() : '';

      if (
        createMessageDto.message &&
        createMessageDto.message.trim() === '[sticker]' &&
        isValidFile &&
        processedAttachments.length > 0
      ) {
        const firstAttachment = processedAttachments[0];
        await this.evolutionService.sendMessageToEvolution(
          'sticker',
          remoteJid,
          firstAttachment.data || '',
          userId,
        );
      } else if (isValidFile && processedAttachments.length > 0) {
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
          evolutionType = 'image';
        }
        await this.evolutionService.sendMessageToEvolution(
          evolutionType,
          remoteJid,
          firstAttachment.data || '',
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
    } catch (evoError: any) {
      this.loggerService.error(
        '[ERROR] Error sending message via EvolutionService:',
        'MessageService',
        evoError.message,
      );
    }
  }

  async create(data: Partial<Message>): Promise<Message> {
    const created = new this.messageModel({
      ...data,
      typeMessage: 'OUTBOUND',
    });
    return created.save();
  }

  async findByLocationId(
    locationId: string,
    page = 1,
    limit = 20,
  ): Promise<{ messages: Message[]; total: number }> {
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ locationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments({ locationId }),
    ]);
    return { messages, total };
  }
}
