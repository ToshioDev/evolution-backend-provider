import { Injectable } from '@nestjs/common';
import { OauthService } from './oauth.service';
import { UserService } from '../user/user.service';
import { LoggerService, DateHelper } from '../../common';

@Injectable()
export class TokenRefreshService {
  private timeoutId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly oauthService: OauthService,
    private readonly userService: UserService,
    private readonly logger: LoggerService,
  ) {}

  async startIntelligentTokenRefreshScheduler(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Token refresh scheduler ya está ejecutándose',
        'TokenRefresh',
      );
      return;
    }

    this.isRunning = true;
    this.logger.log(
      'Iniciando scheduler inteligente de renovación de tokens',
      'TokenRefresh',
    );

    await this.executeTokenCheck();

    await this.scheduleNextCheck();
  }

  private async scheduleNextCheck(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const users = await this.userService.getAllUsersWithTokens();
      const expirationDates: Date[] = [];

      for (const user of users) {
        if (user.ghlAuth?.expires_at) {
          const expiresAt = new Date(user.ghlAuth.expires_at);
          if (DateHelper.isValidDate(expiresAt)) {
            expirationDates.push(expiresAt);
          }
        }
      }

      const optimalInterval =
        DateHelper.calculateOptimalCheckInterval(expirationDates);
      const nextExecutionTime =
        DateHelper.calculateNextExecutionTime(optimalInterval);

      this.logger.log(
        `Próxima verificación programada en ${optimalInterval} minutos (${nextExecutionTime.toLocaleString()})`,
        'TokenRefresh',
        {
          tokensActivos: expirationDates.length,
          intervaloMinutos: optimalInterval,
          proximaEjecucion: nextExecutionTime.toISOString(),
        },
      );

      const timeUntilNext = nextExecutionTime.getTime() - Date.now();
      this.timeoutId = setTimeout(async () => {
        await this.executeTokenCheck();
        await this.scheduleNextCheck();
      }, timeUntilNext);
    } catch (error) {
      this.logger.error(
        'Error al programar próxima verificación de tokens',
        'TokenRefresh',
        error.message,
      );

      // Fallback: programar verificación en 30 minutos
      this.timeoutId = setTimeout(
        async () => {
          await this.executeTokenCheck();
          await this.scheduleNextCheck();
        },
        30 * 60 * 1000,
      );
    }
  }

  private async executeTokenCheck(): Promise<void> {
    try {
      this.logger.log(
        'Ejecutando verificación inteligente de tokens...',
        'TokenRefresh',
      );

      const result = await this.oauthService.checkAndRefreshExpiredTokens();

      this.logger.success(
        `Verificación completada: ${result.refreshed} tokens renovados, ${result.checked} tokens verificados`,
        'TokenRefresh',
      );
    } catch (error) {
      this.logger.error(
        'Error en la verificación automática de tokens',
        'TokenRefresh',
        error.message,
      );
    }
  }

  stopTokenRefreshScheduler(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.isRunning = false;
    this.logger.log(
      'Token refresh scheduler inteligente detenido',
      'TokenRefresh',
    );
  }

  async refreshTokenNow(): Promise<void> {
    this.logger.log(
      'Ejecutando verificación manual de tokens...',
      'TokenRefresh',
    );

    const result = await this.oauthService.checkAndRefreshExpiredTokens();

    this.logger.success(
      `Verificación manual completada: ${result.refreshed} tokens renovados`,
      'TokenRefresh',
    );

    if (this.isRunning) {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      await this.scheduleNextCheck();
    }
  }

  getSchedulerStatus(): {
    isRunning: boolean;
    nextCheckScheduled: boolean;
  } {
    return {
      isRunning: this.isRunning,
      nextCheckScheduled: this.timeoutId !== null,
    };
  }
}
