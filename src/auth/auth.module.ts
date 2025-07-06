import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [AuthGuard, AuthService],
  controllers: [AuthController],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}
