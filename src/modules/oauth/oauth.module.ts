import { Module } from '@nestjs/common';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { OauthStrategy } from './oauth.strategy';
import { TokenRefreshService } from './token-refresh.service';
import { UserModule } from '../user/user.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [UserModule, CommonModule],
  controllers: [OauthController],
  providers: [OauthService, OauthStrategy, TokenRefreshService],
  exports: [OauthService, TokenRefreshService],
})
export class OauthModule {}
