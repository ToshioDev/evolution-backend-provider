import { Injectable } from '@nestjs/common';

@Injectable()
export class EvolutionConfigHelper {

  static readonly BASE_URL = process.env.EVOLUTION_API_URL || '';
  static readonly API_KEY = process.env.EVOLUTION_API_KEY || '';

  static readonly DEFAULT_INSTANCE_SETTINGS = {
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    rejectCall: false,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    groupsIgnore: false,
    syncFullHistory: false,
  };

  static readonly ENDPOINTS = {
    CREATE_INSTANCE: '/instance/create',
    DELETE_INSTANCE: '/instance/delete',
    FETCH_INSTANCES: '/instance/fetchInstances',
    CONNECTION_STATE: '/instance/connectionState',
    RESTART_INSTANCE: '/instance/restart',
    CONNECT_INSTANCE: '/instance/connect',
    UPDATE_SETTINGS: '/settings/set',
    SET_WEBSOCKET: '/websocket/set',
    SEND_TEXT: '/message/sendText',
    SEND_WHATSAPP: '/message/sendWhatsapp',
    SEND_AUDIO: '/message/sendWhatsAppAudio',
  };

  static readonly MESSAGE_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    AUDIO: 'audio',
  } as const;

  static readonly CONNECTION_STATES = {
    PENDING: 'pending',
    CONNECTING: 'connecting',
    OPEN: 'open',
    CLOSE: 'close',
  } as const;

  static validateConfig(): void {
    if (!this.BASE_URL) {
      throw new Error('EVOLUTION_API_URL environment variable is required');
    }
    if (!this.API_KEY) {
      throw new Error('EVOLUTION_API_KEY environment variable is required');
    }
  }

  static buildUrl(
    endpoint: string,
    instanceName?: string,
    params?: string,
  ): string {
    let url = `${this.BASE_URL}${endpoint}`;
    if (instanceName) {
      url += `/${instanceName}`;
    }
    if (params) {
      url += `?${params}`;
    }
    return url;
  }

  static getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: this.API_KEY,
    };
  }

  static generateInstanceName(number?: string): string {
    if (number) {
      const cleanNumber = number.replace(/\D/g, '');
      const shortNumber = cleanNumber.slice(-8);
      return `wh_${shortNumber}`;
    } else {
      const randomId = Math.random().toString(36).substring(2, 7);
      return `wh_${randomId}`;
    }
  }
}
