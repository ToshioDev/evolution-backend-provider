import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { OauthModule } from './modules/oauth/oauth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './modules/user/user.module';
import { EvolutionModule } from './modules/evolution/evolution.module';
import { AuthModule } from './modules/auth/auth.module';
import { MessageModule } from './modules/message/message.module';
import { TokenRefreshService } from './modules/oauth/token-refresh.service';
import { CommonModule } from './common/common.module';
import { ConfigurationService } from './common/configuration/configuration.service';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigurationService) => ({
        uri: configService.getMongoUri(),
      }),
      inject: [ConfigurationService],
    }),
    OauthModule,
    UserModule,
    EvolutionModule,
    AuthModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly tokenRefreshService: TokenRefreshService) {}

  onModuleInit() {
    this.tokenRefreshService.startIntelligentTokenRefreshScheduler();
  }
}
