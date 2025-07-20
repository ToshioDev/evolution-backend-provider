import { Module, forwardRef } from '@nestjs/common';
import { EvolutionService } from './evolution.service';
import { EvolutionController } from './evolution.controller';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../../common/common.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UWebSocket, UWebSocketSchema } from '../user/uwebsocket.schema';
import { Message, MessageSchema } from '../message/message.schema';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: UWebSocket.name, schema: UWebSocketSchema },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
  ],
  providers: [EvolutionService],
  controllers: [EvolutionController],
  exports: [EvolutionService],
})
export class EvolutionModule {}
