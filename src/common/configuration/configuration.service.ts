import { Injectable } from '@nestjs/common';
import { LoggerService } from '../services/logger.service';

export interface EnvironmentConfig {
  GHL_CLIENT_ID: string;
  GHL_CLIENT_SECRET: string;
  GHL_REDIRECT_URI: string;
  GHL_SCOPES: string;

  MONGODB_URI: string;

  PORT: number;
  FRONTEND_URL: string;

  EVOLUTION_API_KEY: string;
  EVOLUTION_API_URL: string;
}

@Injectable()
export class ConfigurationService {
  private readonly config: EnvironmentConfig;

  constructor(private readonly logger: LoggerService) {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
    this.logConfigurationStatus();
  }

  private loadConfiguration(): EnvironmentConfig {
    return {
      GHL_CLIENT_ID: process.env.GHL_CLIENT_ID || '',
      GHL_CLIENT_SECRET: process.env.GHL_CLIENT_SECRET || '',
      GHL_REDIRECT_URI:
        process.env.GHL_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
      GHL_SCOPES: process.env.GHL_SCOPES || '',

      MONGODB_URI:
        process.env.MONGODB_URI || 'mongodb://localhost:27017/evolutiondb',

      PORT: parseInt(process.env.PORT || '3000', 10),
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || '',
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || '',
    };
  }

  private validateConfiguration(): void {
    const requiredFields = [
      'GHL_CLIENT_ID',
      'GHL_CLIENT_SECRET',
      'EVOLUTION_API_KEY',
      'EVOLUTION_API_URL',
    ];

    const missingFields = requiredFields.filter((field) => !this.config[field]);

    if (missingFields.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingFields.join(', ')}`;
      this.logger.error(
        'Configuration validation failed',
        'ConfigurationService',
        { missingFields },
      );
      throw new Error(errorMessage);
    }
  }

  private logConfigurationStatus(): void {
    const configStatus = {
      ghl_configured: !!(
        this.config.GHL_CLIENT_ID && this.config.GHL_CLIENT_SECRET
      ),
      evolution_configured: !!(
        this.config.EVOLUTION_API_KEY && this.config.EVOLUTION_API_URL
      ),
      database_configured: !!this.config.MONGODB_URI,
      frontend_configured: !!this.config.FRONTEND_URL,
      port: this.config.PORT,
    };

    this.logger.success(
      'Configuration loaded successfully',
      'ConfigurationService',
      configStatus,
    );
  }

  getGhlClientId(): string {
    return this.config.GHL_CLIENT_ID;
  }

  getGhlClientSecret(): string {
    return this.config.GHL_CLIENT_SECRET;
  }

  getGhlRedirectUri(): string {
    return this.config.GHL_REDIRECT_URI;
  }

  getGhlScopes(): string {
    return this.config.GHL_SCOPES;
  }

  getGhlScopesArray(): string[] {
    return this.config.GHL_SCOPES ? this.config.GHL_SCOPES.split(' ') : [];
  }

  getMongoUri(): string {
    return this.config.MONGODB_URI;
  }

  getPort(): number {
    return this.config.PORT;
  }

  getFrontendUrl(): string {
    return this.config.FRONTEND_URL;
  }

  getEvolutionApiKey(): string {
    return this.config.EVOLUTION_API_KEY;
  }

  getEvolutionApiUrl(): string {
    return this.config.EVOLUTION_API_URL;
  }

  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  buildOAuthUrl(): string {
    const clientId = this.getGhlClientId();
    const redirectUri = this.getGhlRedirectUri();
    const scope = this.getGhlScopes();

    return `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}`;
  }

  getConfigurationSummary(): object {
    return {
      ghl: {
        client_id_configured: !!this.config.GHL_CLIENT_ID,
        client_secret_configured: !!this.config.GHL_CLIENT_SECRET,
        redirect_uri: this.config.GHL_REDIRECT_URI,
        scopes_count: this.getGhlScopesArray().length,
      },
      database: {
        mongodb_configured: !!this.config.MONGODB_URI,
        connection_type: this.config.MONGODB_URI.includes('localhost')
          ? 'local'
          : 'remote',
      },
      application: {
        port: this.config.PORT,
        frontend_url: this.config.FRONTEND_URL,
        environment: process.env.NODE_ENV || 'development',
      },
      evolution: {
        api_key_configured: !!this.config.EVOLUTION_API_KEY,
        api_url_configured: !!this.config.EVOLUTION_API_URL,
        api_url: this.config.EVOLUTION_API_URL,
      },
    };
  }

  validateModuleConfig(moduleName: string): boolean {
    switch (moduleName.toLowerCase()) {
      case 'auth':
        return !!this.config.GHL_CLIENT_ID && !!this.config.GHL_CLIENT_SECRET;

      case 'oauth':
        return (
          !!this.config.GHL_CLIENT_ID &&
          !!this.config.GHL_CLIENT_SECRET &&
          !!this.config.GHL_REDIRECT_URI
        );

      case 'evolution':
        return (
          !!this.config.EVOLUTION_API_KEY && !!this.config.EVOLUTION_API_URL
        );

      case 'user':
        return !!this.config.MONGODB_URI;

      case 'message':
        return (
          !!this.config.EVOLUTION_API_KEY && !!this.config.EVOLUTION_API_URL
        );

      default:
        return true;
    }
  }

  logModuleConfig(moduleName: string): void {
    const isValid = this.validateModuleConfig(moduleName);
    const logLevel = isValid ? 'success' : 'warn';

    this.logger[logLevel](
      `${moduleName} module configuration ${isValid ? 'valid' : 'incomplete'}`,
      'ConfigurationService',
      { module: moduleName, valid: isValid },
    );
  }
}
