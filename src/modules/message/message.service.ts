import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.schema';
import { LoggerService, ConfigurationService } from '../../common';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigurationService,
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

  async findSentMessages(
    locationId: string,
    page = 1,
    limit = 20,
    contactId?: string,
    conversationId?: string,
  ): Promise<{ messages: Message[]; total: number }> {
    const skip = (page - 1) * limit;

    const filter: any = {
      locationId,
      typeMessage: 'OUTBOUND',
    };

    if (contactId) {
      filter.contactId = contactId;
    }

    if (conversationId) {
      filter.conversationId = conversationId;
    }

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(filter),
    ]);

    return { messages, total };
  }

  async findReceivedMessages(
    locationId: string,
    page = 1,
    limit = 20,
    contactId?: string,
    conversationId?: string,
  ): Promise<{ messages: Message[]; total: number }> {
    const skip = (page - 1) * limit;

    const filter: any = {
      locationId,
      typeMessage: 'INBOUND',
    };

    if (contactId) {
      filter.contactId = contactId;
    }

    if (conversationId) {
      filter.conversationId = conversationId;
    }

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(filter),
    ]);

    return { messages, total };
  }

  async findConversationMessages(
    locationId: string,
    conversationId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: Message[]; total: number }> {
    const skip = (page - 1) * limit;

    const filter = {
      locationId,
      conversationId,
    };

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(filter),
    ]);

    return { messages, total };
  }

  async findContactMessages(
    locationId: string,
    contactId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: Message[]; total: number }> {
    const skip = (page - 1) * limit;

    const filter = {
      locationId,
      contactId,
    };

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(filter),
    ]);

    return { messages, total };
  }
}
