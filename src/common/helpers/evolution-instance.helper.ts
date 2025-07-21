import { Injectable } from '@nestjs/common';
import { EvolutionConfigHelper } from './evolution-config.helper';

export interface CreateInstanceData {
  instanceName: string;
  token?: string;
  qrcode?: boolean;
  number?: string;
  integration?: string;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

export interface UpdateInstanceSettingsData {
  alwaysOnline?: boolean;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

export interface InstanceValidationResult {
  isValid: boolean;
  needsRestart: boolean;
  hasValidProfile: boolean;
  profileName?: string;
  connectionState?: string;
  reason?: string;
}

@Injectable()
export class EvolutionInstanceHelper {
  /**
   * Crea datos básicos para una nueva instancia
   */
  static createBasicInstanceData(
    instanceName: string,
    number?: string,
    customSettings?: Partial<CreateInstanceData>,
  ): CreateInstanceData {
    const basicData: CreateInstanceData = {
      instanceName,
      ...EvolutionConfigHelper.DEFAULT_INSTANCE_SETTINGS,
      ...customSettings,
    };

    if (number) {
      basicData.number = number;
    }

    return basicData;
  }

  /**
   * Valida el estado de una instancia
   */
  static validateInstance(instanceData: any): InstanceValidationResult {
    if (!instanceData) {
      return {
        isValid: false,
        needsRestart: false,
        hasValidProfile: false,
        reason: 'Instance not found',
      };
    }

    const hasValidProfile =
      instanceData.profileName && instanceData.profileName !== null;
    const needsRestart = !hasValidProfile;

    return {
      isValid: hasValidProfile,
      needsRestart,
      hasValidProfile,
      profileName: instanceData.profileName,
      connectionState: instanceData.connectionState,
      reason: hasValidProfile ? 'Valid profile' : 'Invalid or null profile',
    };
  }

  /**
   * Encuentra la instancia primaria de un usuario
   */
  static findPrimaryInstance(instances: any[]): any | null {
    if (!instances || instances.length === 0) {
      return null;
    }

    // Buscar instancia marcada como primaria
    const primaryInstance = instances.find(
      (instance) => instance.isPrimary === true,
    );

    // Si no hay primaria, retornar la primera disponible
    return primaryInstance || instances[0];
  }

  /**
   * Valida los datos de configuración de instancia
   */
  static validateInstanceSettings(
    settings: UpdateInstanceSettingsData,
  ): boolean {
    const validKeys = [
      'alwaysOnline',
      'rejectCall',
      'msgCall',
      'groupsIgnore',
      'readMessages',
      'readStatus',
      'syncFullHistory',
    ];

    return Object.keys(settings).every((key) => validKeys.includes(key));
  }

  /**
   * Limpia y valida un número de teléfono
   */
  static cleanPhoneNumber(number: string): string {
    return number.replace(/\D/g, '');
  }

  /**
   * Construye datos de mensaje según el tipo
   */
  static buildMessageData(
    type: 'text' | 'image' | 'audio' | 'video' | 'document',
    target: string,
    content: string,
  ): any {
    const baseData = { number: target };

    switch (type) {
      case 'text':
        return { ...baseData, text: content };
      case 'image':
        return { ...baseData, mediatype: 'image', media: content };
      case 'video':
        return { ...baseData, mediatype: 'video', media: content };
      case 'document':
        return { ...baseData, mediatype: 'document', media: content };
      case 'audio':
        return { audio: content };
      default:
        throw new Error(`Unsupported message type: ${type}`);
    }
  }

  /**
   * Determina el endpoint correcto según el tipo de mensaje
   */
  static getMessageEndpoint(type: 'text' | 'image' | 'audio'): string {
    switch (type) {
      case 'text':
        return EvolutionConfigHelper.ENDPOINTS.SEND_TEXT;
      case 'image':
        return EvolutionConfigHelper.ENDPOINTS.SEND_MEDIA;
      case 'audio':
        return EvolutionConfigHelper.ENDPOINTS.SEND_AUDIO;
      default:
        throw new Error(`Unsupported message type: ${type}`);
    }
  }

  /**
   * Convierte configuraciones a formato API
   */
  static formatSettingsForAPI(
    settings: UpdateInstanceSettingsData,
  ): UpdateInstanceSettingsData {
    // Validar y limpiar configuraciones
    const validatedSettings: UpdateInstanceSettingsData = {};

    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        validatedSettings[key as keyof UpdateInstanceSettingsData] = value;
      }
    });

    return validatedSettings;
  }
}
