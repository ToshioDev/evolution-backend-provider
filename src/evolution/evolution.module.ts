import { Module } from '@nestjs/common';
import { EvolutionService } from './evolution.service';
import { EvolutionController } from './evolution.controller';
import { UserModule } from '../user/user.module';

@Module({
  providers: [EvolutionService],
  imports: [UserModule],
  controllers: [EvolutionController],
})
export class EvolutionModule {}
