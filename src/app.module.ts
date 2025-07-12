import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { OauthModule } from './oauth/oauth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { EvolutionModule } from './evolution/evolution.module';
import { AuthModule } from './auth/auth.module';
import { MessageModule } from './message/message.module';
import { TokenRefreshService } from './oauth/token-refresh.service';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/evolutiondb',
    ),
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
    // Iniciar el scheduler de renovación de tokens cada 5 minutos
    this.tokenRefreshService.startTokenRefreshScheduler(5);
  }
}
