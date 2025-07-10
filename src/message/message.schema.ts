import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true, strict: false })
export class Message {
  @Prop()
  locationId?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  receivedData: any;

  // Permitir cualquier campo adicional
  [key: string]: any;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
