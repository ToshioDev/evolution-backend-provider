import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

@Injectable()
export class OauthStrategy extends PassportStrategy(Strategy, 'oauth2') {
  constructor() {
    super({
      authorizationURL: 'https://marketplace.gohighlevel.com/oauth/chooselocation', // Go High Level API v2
      tokenURL: 'https://services.leadconnectorhq.com/oauth/token', // Go High Level API v2
      clientID: '68685634707918512c0d0f58-mcpfxcgr', // Client ID real de Go High Level
      clientSecret: '40091997-0eb3-4fe1-b7ad-0e536a4121b9', // Client Secret real de Go High Level
      callbackURL: 'http://localhost:3000/oauth/callback', // Debe coincidir con el registrado en Go High Level
      scope: process.env.GHL_SCOPES ? process.env.GHL_SCOPES.split(' ') : [], // Scopes configurables por .env
      passReqToCallback: false,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    // Aquí puedes buscar o crear el usuario en tu base de datos
    // y devolver el usuario autenticado
    const user = {
      accessToken,
      refreshToken,
      profile,
    };
    done(null, user);
  }
}
