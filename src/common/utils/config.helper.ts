import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigHelper {

    static readonly GHL_TOKEN_URL =
    'https://services.leadconnectorhq.com/oauth/token';
  static readonly DEFAULT_REDIRECT_URI = 'http://localhost:3000/oauth/callback';
  static readonly DEFAULT_USER_TYPE = 'Location';

  // Token Refresh Configuration
  static readonly DEFAULT_TOKEN_BUFFER_MINUTES = 10; // Renovar 10 minutos antes
  static readonly DEFAULT_REFRESH_INTERVAL_MINUTES = 5; // Verificar cada 5 minutos
  static readonly MAX_REFRESH_ATTEMPTS = 3;

  // Grant Types
  static readonly GRANT_TYPE_AUTHORIZATION_CODE = 'authorization_code';
  static readonly GRANT_TYPE_REFRESH_TOKEN = 'refresh_token';

  // Environment Variables Getters
  static getGhlClientId(): string {
    const clientId = process.env.GHL_CLIENT_ID;
    if (!clientId) {
      throw new Error('GHL_CLIENT_ID environment variable is required');
    }
    return clientId;
  }

  static getGhlClientSecret(): string {
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error('GHL_CLIENT_SECRET environment variable is required');
    }
    return clientSecret;
  }

  static getGhlRedirectUri(): string {
    return process.env.GHL_REDIRECT_URI || this.DEFAULT_REDIRECT_URI;
  }

  static getGhlScopes(): string {
    return process.env.GHL_SCOPES || '';
  }

  static getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  static getMongoUri(): string {
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/evolutiondb';
  }

  // Validation Methods
  static validateRequiredEnvVars(): void {
    try {
      this.getGhlClientId();
      this.getGhlClientSecret();
    } catch (error) {
      throw new Error(`Environment validation failed: ${error.message}`);
    }
  }

  // OAuth URL Builder
  static buildOAuthUrl(): string {
    const clientId = this.getGhlClientId();
    const redirectUri = this.getGhlRedirectUri();
    const scope = this.getGhlScopes();

    return `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}`;
  }
}
