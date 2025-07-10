import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  locationId: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
