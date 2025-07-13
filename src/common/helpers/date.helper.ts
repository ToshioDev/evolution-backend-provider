import { Injectable } from '@nestjs/common';

@Injectable()
export class DateHelper {
  /**
   * Calcula la fecha de expiración basada en una fecha de creación y tiempo de vida en segundos
   */
  static calculateExpirationDate(
    createdAt: Date,
    expiresInSeconds: number,
  ): Date {
    return new Date(createdAt.getTime() + expiresInSeconds * 1000);
  }

  /**
   * Verifica si un token está expirado o por expirar dentro del buffer especificado
   */
  static isTokenExpiredOrExpiringSoon(
    expiresAt: Date,
    bufferMinutes = 10,
  ): boolean {
    const now = new Date();
    const bufferTime = bufferMinutes * 60 * 1000; // Convertir minutos a milisegundos
    return expiresAt.getTime() <= now.getTime() + bufferTime;
  }

  /**
   * Calcula la fecha de expiración para tokens existentes sin expires_at
   */
  static calculateExpirationFromLegacyData(
    createdAt: Date | undefined,
    expiresInSeconds: number,
  ): Date {
    if (createdAt) {
      return this.calculateExpirationDate(createdAt, expiresInSeconds);
    }
    // Si no hay created_at, asumir que el token está expirado
    return new Date(0);
  }

  /**
   * Obtiene el tiempo restante hasta la expiración en segundos
   */
  static getTimeUntilExpiry(expiresAt: Date): number {
    const now = new Date();
    return Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
    );
  }

  /**
   * Convierte segundos a formato legible (horas, minutos, segundos)
   */
  static formatSeconds(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  /**
   * Verifica si una fecha es válida
   */
  static isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }


  static calculateNextCheckInterval(expiresAt: Date): number {
    const timeUntilExpirySeconds = this.getTimeUntilExpiry(expiresAt);
    const timeUntilExpiryMinutes = Math.floor(timeUntilExpirySeconds / 60);

    if (timeUntilExpiryMinutes <= 2880) {
      return 240;
    }
    else {
      return 720;
    }
  }

  static calculateOptimalCheckInterval(expirationDates: Date[]): number {
    if (expirationDates.length === 0) {
      return 240; 
    }

    const earliestExpiration = expirationDates.reduce((earliest, current) => {
      return current < earliest ? current : earliest;
    });

    const calculatedInterval =
      this.calculateNextCheckInterval(earliestExpiration);

    return Math.max(calculatedInterval, 5);
  }


  static calculateNextExecutionTime(intervalMinutes: number): Date {
    const now = new Date();
    return new Date(now.getTime() + intervalMinutes * 60 * 1000);
  }


  static getTokenExpirationInfo(expiresAt: Date): {
    isExpired: boolean;
    isExpiringSoon: boolean;
    timeUntilExpirySeconds: number;
    timeUntilExpiryFormatted: string;
    recommendedCheckInterval: number;
  } {
    const timeUntilExpirySeconds = this.getTimeUntilExpiry(expiresAt);
    const isExpired = timeUntilExpirySeconds <= 0;
    const isExpiringSoon = this.isTokenExpiredOrExpiringSoon(expiresAt, 10);
    const recommendedCheckInterval = this.calculateNextCheckInterval(expiresAt);

    return {
      isExpired,
      isExpiringSoon,
      timeUntilExpirySeconds,
      timeUntilExpiryFormatted: this.formatSeconds(timeUntilExpirySeconds),
      recommendedCheckInterval,
    };
  }
}
