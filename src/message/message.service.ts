import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.schema';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async create(data: Partial<Message>): Promise<Message> {
    const created = new this.messageModel(data);
    return created.save();
  }

  async findAll(): Promise<Message[]> {
    return this.messageModel.find();
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messageModel.findById(id);

    if (!message) {
      throw new HttpException('Mensaje no encontrado', HttpStatus.NOT_FOUND);
    }

    return message;
  }

  async update(id: string, data: Partial<Message>): Promise<Message> {
    const message = await this.messageModel.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!message) {
      throw new HttpException('Mensaje no encontrado', HttpStatus.NOT_FOUND);
    }

    return message;
  }

  async remove(id: string): Promise<void> {
    const result = await this.messageModel.findByIdAndDelete(id);

    if (!result) {
      throw new HttpException('Mensaje no encontrado', HttpStatus.NOT_FOUND);
    }
  }
}
