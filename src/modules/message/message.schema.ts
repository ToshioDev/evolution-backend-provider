import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true, strict: false })
export class Message {
  @Prop()
  userId?: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  attachments: any[];

  @Prop({ required: true })
  contactId: string;

  @Prop({ required: true })
  locationId: string;

  @Prop({ required: true })
  messageId: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, enum: ['INBOUND', 'OUTBOUND'], default: 'OUTBOUND' })
  typeMessage: string;

  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  [key: string]: any;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
