import { Injectable, Logger } from '@nestjs/common';
import { OauthService } from '../oauth/oauth.service';

@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private readonly oauthService: OauthService) {}

  startTokenRefreshScheduler(intervalMinutes = 5): void {
    if (this.intervalId) {
      this.logger.warn('Token refresh scheduler ya está ejecutándose');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000; 

    this.logger.log(
      `Iniciando scheduler de renovación de tokens cada ${intervalMinutes} minutos`,
    );

    this.intervalId = setInterval(async () => {
      try {
        await this.oauthService.checkAndRefreshExpiredTokens();
      } catch (error) {
        this.logger.error(
          'Error en el scheduler de renovación de tokens:',
          error.message,
        );
      }
    }, intervalMs);

    this.oauthService.checkAndRefreshExpiredTokens().catch((error) => {
      this.logger.error(
        'Error en la verificación inicial de tokens:',
        error.message,
      );
    });
  }

  stopTokenRefreshScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('Token refresh scheduler detenido');
    }
  }

  async refreshTokenNow(): Promise<void> {
    this.logger.log('Ejecutando verificación manual de tokens...');
    await this.oauthService.checkAndRefreshExpiredTokens();
  }
}
