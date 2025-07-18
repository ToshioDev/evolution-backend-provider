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
      type: 'OUTBOUND',
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
