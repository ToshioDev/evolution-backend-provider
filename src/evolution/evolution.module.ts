import { Module } from '@nestjs/common';
import { EvolutionService } from './evolution.service';
import { EvolutionController } from './evolution.controller';

@Module({
  providers: [EvolutionService],
  controllers: [EvolutionController]
})
export class EvolutionModule {}
