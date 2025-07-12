import { Module, forwardRef } from '@nestjs/common';
import { EvolutionService } from './evolution.service';
import { EvolutionController } from './evolution.controller';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => UserModule), forwardRef(() => AuthModule)],
  providers: [EvolutionService],
  controllers: [EvolutionController],
  exports: [EvolutionService], 
})
export class EvolutionModule {}
