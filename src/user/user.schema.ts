import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export interface GhlAuth {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  refreshTokenId?: string;
  userType: string;
  companyId: string;
  locationId: string;
  isBulkInstallation?: boolean;
  userId: string;
  [key: string]: any;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'JVNpuC2h3NmmWohtPTQ5' })
  locationId: string;

  @Prop({ unique: true, sparse: true })
  userToken: string;

  @Prop({
    type: Object,
    default: null,
  })
  ghlAuth: GhlAuth | null;

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        connectionStatus: { type: String, required: true },
        ownerJid: { type: String, required: true },
        token: { type: String, required: true },
      },
    ],
    default: [],
  })
  evolutionInstances: Array<{
    id: string;
    name: string;
    connectionStatus: string;
    ownerJid: string;
    token: string;
  }>;
}

export const UserSchema = SchemaFactory.createForClass(User);
