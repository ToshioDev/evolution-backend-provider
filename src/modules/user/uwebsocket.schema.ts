import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UWebSocketDocument = UWebSocket & Document;

@Schema({ timestamps: true, collection: 'uwebsockets' })
export class UWebSocket {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  instanceName: string;

  @Prop({ required: true })
  enabled: boolean;

  @Prop({ type: [String], default: [] })
  events: string[];
}

export const UWebSocketSchema = SchemaFactory.createForClass(UWebSocket);
