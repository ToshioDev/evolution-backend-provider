import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { Message, MessageSchema } from './message.schema';
import { UserModule } from '../user/user.module';
import { EvolutionModule } from '../evolution/evolution.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    UserModule,
    EvolutionModule,
  ],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
