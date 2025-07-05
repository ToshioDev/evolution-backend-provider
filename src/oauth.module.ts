import { Module } from '@nestjs/common';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { OauthStrategy } from './oauth.strategy';

@Module({
  controllers: [OauthController],
  providers: [OauthService, OauthStrategy],
})
export class OauthModule {}
