import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { OauthModule } from './oauth/oauth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { EvolutionModule } from './evolution/evolution.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/evolutiondb',
    ),
    OauthModule,
    UserModule,
    EvolutionModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
