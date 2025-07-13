import { Injectable } from '@nestjs/common';

export enum LogLevel {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  DEBUG = 'debug',
}

export interface LogMessage {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp?: Date;
}

@Injectable()
export class LoggerService {
  private readonly colors = require('colors');
  private readonly brand: string;

  constructor() {
    this.brand =
      this.colors.bgBlue(this.colors.white(this.colors.bold(' WhatHub '))) +
      this.colors.bgGreen(this.colors.white(this.colors.bold(' GateWay ')));
  }

  private formatMessage(logMessage: LogMessage): string {
    const timestamp = (logMessage.timestamp || new Date()).toISOString();
    const context = logMessage.context ? `[${logMessage.context}]` : '';
    return `${timestamp} ${context} ${logMessage.message}`;
  }

  private getColoredMessage(message: string, level: LogLevel): string {
    switch (level) {
      case LogLevel.SUCCESS:
        return this.colors.green(message);
      case LogLevel.WARNING:
        return this.colors.yellow(message);
      case LogLevel.ERROR:
        return this.colors.red(message);
      case LogLevel.DEBUG:
        return this.colors.cyan(message);
      case LogLevel.INFO:
      default:
        return this.colors.white(message);
    }
  }

  log(message: string, context?: string, data?: any): void {
    this.logMessage({
      level: LogLevel.INFO,
      message,
      context,
      data,
    });
  }

  success(message: string, context?: string, data?: any): void {
    this.logMessage({
      level: LogLevel.SUCCESS,
      message,
      context,
      data,
    });
  }

  warn(message: string, context?: string, data?: any): void {
    this.logMessage({
      level: LogLevel.WARNING,
      message,
      context,
      data,
    });
  }

  error(message: string, context?: string, data?: any): void {
    this.logMessage({
      level: LogLevel.ERROR,
      message,
      context,
      data,
    });
  }

  debug(message: string, context?: string, data?: any): void {
    this.logMessage({
      level: LogLevel.DEBUG,
      message,
      context,
      data,
    });
  }

  private logMessage(logMessage: LogMessage): void {
    const formattedMessage = this.formatMessage(logMessage);
    const coloredMessage = this.getColoredMessage(
      formattedMessage,
      logMessage.level,
    );

    if (logMessage.data) {
      console.log(this.brand, coloredMessage, logMessage.data);
    } else {
      console.log(this.brand, coloredMessage);
    }
  }

  // Métodos específicos para OAuth
  oauthSuccess(message: string, locationId?: string, data?: any): void {
    const fullMessage = locationId
      ? `${message} (LocationID: ${locationId})`
      : message;
    this.success(fullMessage, 'OAuth', data);
  }

  oauthError(message: string, locationId?: string, error?: any): void {
    const fullMessage = locationId
      ? `${message} (LocationID: ${locationId})`
      : message;
    this.error(fullMessage, 'OAuth', error);
  }

  oauthWarning(message: string, locationId?: string, data?: any): void {
    const fullMessage = locationId
      ? `${message} (LocationID: ${locationId})`
      : message;
    this.warn(fullMessage, 'OAuth', data);
  }

  oauthInfo(message: string, locationId?: string, data?: any): void {
    const fullMessage = locationId
      ? `${message} (LocationID: ${locationId})`
      : message;
    this.log(fullMessage, 'OAuth', data);
  }

  // Métodos para token refresh
  tokenRefreshStart(): void {
    this.debug('Iniciando verificación de tokens expirados...', 'TokenRefresh');
  }

  tokenRefreshSuccess(
    locationId: string,
    method: 'auto' | 'manual' = 'auto',
  ): void {
    const message =
      method === 'auto'
        ? 'Token renovado automáticamente'
        : 'Token renovado manualmente';
    this.oauthSuccess(message, locationId);
  }

  tokenRefreshWarning(locationId: string, message: string): void {
    this.oauthWarning(`Token por expirar - ${message}`, locationId);
  }

  tokenRefreshError(locationId: string, error: any): void {
    this.oauthError('Error al renovar token', locationId, {
      message: error.message,
      stack: error.stack,
    });
  }

  // Método para logs de API de GHL
  ghlApiError(endpoint: string, params: any, error: any): void {
    this.error(`Error en API de GHL - ${endpoint}`, 'GHL-API', {
      sent_params: params,
      response_data: error.response?.data,
      status: error.response?.status,
      message: error.message,
    });
  }
}
