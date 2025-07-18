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
  expires_at?: Date;
  created_at?: Date;
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
        evolutionId: { type: String, required: true },
        profileName: { type: String, required: true },
        profilePicUrl: { type: String, default: null },
        isPrimary: { type: Boolean, default: false },
        hasWebSocket: { type: Boolean, default: false },
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
    evolutionId: string;
    profileName: string;
    isPrimary: boolean;
    profilePicUrl: string | null;
    hasWebSocket: boolean;
  }>;
}

export const UserSchema = SchemaFactory.createForClass(User);
