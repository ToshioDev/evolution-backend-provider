import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.schema';
import {
  CreateMessageDto,
  MessageResponseDto,
} from './dto/message.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async create(
    createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    const message = new this.messageModel(createMessageDto);
    const savedMessage = await message.save();

    return this.formatMessageResponse(savedMessage);
  }

  async findAll(): Promise<MessageResponseDto[]> {
    const messages = await this.messageModel.find().sort({ createdAt: -1 });
    return messages.map((message) => this.formatMessageResponse(message));
  }

  async findByLocationId(locationId: string): Promise<MessageResponseDto[]> {
    const messages = await this.messageModel
      .find({ locationId })
      .sort({ createdAt: -1 });

    return messages.map((message) => this.formatMessageResponse(message));
  }

  async findBySender(sender: string): Promise<MessageResponseDto[]> {
    const messages = await this.messageModel
      .find({ sender })
      .sort({ createdAt: -1 });

    return messages.map((message) => this.formatMessageResponse(message));
  }

  async findByLocationAndSender(
    locationId: string,
    sender: string,
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messageModel
      .find({ locationId, sender })
      .sort({ createdAt: -1 });

    return messages.map((message) => this.formatMessageResponse(message));
  }

  async findOne(id: string): Promise<MessageResponseDto> {
    const message = await this.messageModel.findById(id);

    if (!message) {
      throw new HttpException('Mensaje no encontrado', HttpStatus.NOT_FOUND);
    }

    return this.formatMessageResponse(message);
  }


  private formatMessageResponse(message: MessageDocument): MessageResponseDto {
    return {
      id: (message._id as any).toString(),
      locationId: message.locationId,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
