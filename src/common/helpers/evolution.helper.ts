import { ConfigurationService } from '../configuration/configuration.service';

export class EvolutionHelper {
  static ENDPOINTS = {
    SEND_AUDIO: 'sendAudio',
    SEND_WHATSAPP: 'sendWhatsapp',
    SEND_TEXT: 'sendText',
    FETCH_INSTANCES: 'fetchInstances',
    CREATE_INSTANCE: 'createInstance',
    DELETE_INSTANCE: 'deleteInstance',
    UPDATE_INSTANCE_SETTINGS: 'updateInstanceSettings',
    CONNECT_INSTANCE: 'connectInstance',
    RESTART_INSTANCE: 'restartInstance',
    LOGOUT_INSTANCE: 'logoutInstance',
  };

  static CONNECTION_STATES = {
    PENDING: 'PENDING',
    CONNECTING: 'CONNECTING',
    OPEN: 'OPEN',
    CLOSE: 'CLOSE',
  };

  static buildUrl(
    endpoint: string,
    instanceName?: string,
    configService?: ConfigurationService,
  ): string {
    const baseUrl = configService
      ? configService.getEvolutionApiUrl()
      : process.env.EVOLUTION_API_BASE_URL;

    if (instanceName) {
      return `${baseUrl}/message/${endpoint}/${instanceName}`;
    }
    return `${baseUrl}/instance/${endpoint}`;
  }

  static getHeaders(configService?: ConfigurationService) {
    const apikey = configService
      ? configService.getEvolutionApiKey()
      : process.env.EVOLUTION_API_KEY;

    return {
      'Content-Type': 'application/json',
      apikey: apikey,
    };
  }

  static generateInstanceName(number: string): string {
    return `instance_${number.replace(/\D/g, '')}`;
  }
}
