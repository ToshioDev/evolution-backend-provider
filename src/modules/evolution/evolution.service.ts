import { Injectable, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { UserService } from '../user/user.service';
import {
  LoggerService,
  EvolutionConfigHelper,
  EvolutionInstanceHelper,
  CreateInstanceData,
  UpdateInstanceSettingsData,
  ConfigurationService,
} from '../../common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UWebSocket, UWebSocketDocument } from '../user/uwebsocket.schema';

@Injectable()
export class EvolutionService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigurationService,
    @InjectModel(UWebSocket.name)
    private readonly uWebSocketModel: Model<UWebSocketDocument>,
  ) {
    this.configService.logModuleConfig('evolution');
  }

  async sendAudio(
    number: string,
    audio: string,
    instanceName: string,
  ): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.SEND_AUDIO,
      instanceName,
    );

    const audioData = { number, audio };

    // Log detallado para debugging
    this.logger.log(
      `[SEND_AUDIO_DEBUG] Preparando envío de audio`,
      'Evolution',
      {
        url,
        instanceName,
        audio: audio.substring(0, 100) + '...', // Solo primeros 100 chars de la URL
        audioData,
        headers: EvolutionConfigHelper.getHeaders(),
      },
    );

    try {
      const response = await axios.post(url, audioData, {
        headers: EvolutionConfigHelper.getHeaders(),
      });

      this.logger.success(
        `Audio enviado exitosamente a instancia: ${instanceName}`,
        'Evolution',
      );

      return response.data;
    } catch (error: any) {
      // Log detallado del error
      this.logger.error(
        `[SEND_AUDIO_ERROR] Error detallado al enviar audio`,
        'Evolution',
        {
          url,
          instanceName,
          audio: audio.substring(0, 100) + '...',
          audioData,
          headers: EvolutionConfigHelper.getHeaders(),
          errorStatus: error.response?.status,
          errorStatusText: error.response?.statusText,
          errorData: error.response?.data,
          errorMessage: error.message,
          fullError: error.response || error,
        },
      );

      throw new Error(`Failed to send audio: ${error.message}`);
    }
  }

  async sendSticker(
    number: string,
    sticker: string,
    instanceName: string,
  ): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.SEND_STICKER,
      instanceName,
    );

    const stickerData = { number, sticker };

    // Log detallado para debugging
    this.logger.log(
      `[SEND_STICKER_DEBUG] Preparando envío de sticker`,
      'Evolution',
      {
        url,
        instanceName,
        number,
        sticker: sticker.substring(0, 100) + '...', // Solo primeros 100 chars de la URL
        stickerData,
        headers: EvolutionConfigHelper.getHeaders(),
      },
    );

    try {
      const response = await axios.post(url, stickerData, {
        headers: EvolutionConfigHelper.getHeaders(),
      });

      this.logger.success(
        `Sticker enviado exitosamente a ${number}`,
        'Evolution',
      );

      return response.data;
    } catch (error: any) {
      // Log detallado del error
      this.logger.error(
        `[SEND_STICKER_ERROR] Error detallado al enviar sticker`,
        'Evolution',
        {
          url,
          instanceName,
          number,
          sticker: sticker.substring(0, 100) + '...',
          stickerData,
          headers: EvolutionConfigHelper.getHeaders(),
          errorStatus: error.response?.status,
          errorStatusText: error.response?.statusText,
          errorData: error.response?.data,
          errorMessage: error.message,
          fullError: error.response || error,
        },
      );

      throw new Error(`Failed to send sticker: ${error.message}`);
    }
  }

  async sendMessageToEvolution(
    type: 'audio' | 'text' | 'image' | 'sticker',
    target: string,
    content: string,
    userId: string,
  ): Promise<any> {
    const primaryInstance = await this.getPrimaryInstanceForUser(userId);
    const instanceUniqueName = primaryInstance.id;

    this.logger.debug(
      `Enviando mensaje tipo ${type} a ${target}`,
      'Evolution',
      { type, target, userId, instanceUniqueName },
    );

    switch (type) {
      case 'audio':
        return this.sendAudio(target, content, instanceUniqueName);
      case 'text':
        return this.sendMessage(target, content, instanceUniqueName);
      case 'image':
        return this.sendImage(target, content, instanceUniqueName);
      case 'sticker':
        return this.sendSticker(target, content, instanceUniqueName);
      default:
        throw new Error('Unsupported message type');
    }
  }

  async sendImage(
    number: string,
    media: string,
    instanceName: string,
  ): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.SEND_MEDIA,
      instanceName,
    );

    const messageData = EvolutionInstanceHelper.buildMessageData(
      'image',
      number,
      media,
    );

    // Log detallado para debugging
    this.logger.log(
      `[SEND_IMAGE_DEBUG] Preparando envío de imagen`,
      'Evolution',
      {
        url,
        instanceName,
        number,
        media: media.substring(0, 100) + '...', // Solo primeros 100 chars de la URL
        messageData,
        headers: EvolutionConfigHelper.getHeaders(),
      },
    );

    try {
      const response = await axios.post(url, messageData, {
        headers: EvolutionConfigHelper.getHeaders(),
      });

      this.logger.success(
        `Imagen enviada exitosamente a ${number}`,
        'Evolution',
      );

      return response.data;
    } catch (error: any) {
      // Log detallado del error
      this.logger.error(
        `[SEND_IMAGE_ERROR] Error detallado al enviar imagen`,
        'Evolution',
        {
          url,
          instanceName,
          number,
          media: media.substring(0, 100) + '...',
          messageData,
          headers: EvolutionConfigHelper.getHeaders(),
          errorStatus: error.response?.status,
          errorStatusText: error.response?.statusText,
          errorData: error.response?.data,
          errorMessage: error.message,
          fullError: error.response || error,
        },
      );

      throw new Error(`Failed to send image: ${error.message}`);
    }
  }

  async sendMessage(
    number: string,
    text: string,
    instanceName: string,
  ): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.SEND_TEXT,
      instanceName,
    );

    const messageData = EvolutionInstanceHelper.buildMessageData(
      'text',
      number,
      text,
    );

    try {
      const response = await axios.post(url, messageData, {
        headers: EvolutionConfigHelper.getHeaders(),
      });

      this.logger.success(
        `Mensaje enviado exitosamente a ${number}`,
        'Evolution',
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al enviar mensaje a ${number}`,
        'Evolution',
        error.message,
      );
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async createBasicInstance(userId: string, number?: string): Promise<any> {
    const instanceName = EvolutionConfigHelper.generateInstanceName(number);

    const basicData = EvolutionInstanceHelper.createBasicInstanceData(
      instanceName,
      number,
    );

    this.logger.log(
      `Generando instancia con nombre único: ${instanceName}`,
      'Evolution',
      {
        configuraciones: {
          rejectCall: basicData.rejectCall,
          alwaysOnline: basicData.alwaysOnline,
          readMessages: basicData.readMessages,
          groupsIgnore: basicData.groupsIgnore,
        },
      },
    );

    // Update user with new instance
    const updateResult = await this.userService.updateUserEvolutionInstances(
      userId,
      {
        id: instanceName,
        name: instanceName,
        connectionStatus: EvolutionConfigHelper.CONNECTION_STATES.PENDING,
        ownerJid: '',
        token: '',
      },
    );

    if (!updateResult) {
      throw new Error('Failed to update user with new instance');
    }

    return this.createInstance(basicData);
  }

  async getInstanceByName(instanceName: string): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.FETCH_INSTANCES,
    );

    try {
      const response = await axios.get(url, {
        headers: EvolutionConfigHelper.getHeaders(),
        params: { instanceName },
      });

      const data = response.data;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error(`Instance ${instanceName} not found`);
      }

      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      this.logger.error(
        `Error al obtener información de instancia: ${instanceName}`,
        'Evolution',
        error.message,
      );
      throw new Error(`Failed to get instance by name: ${error.message}`);
    }
  }

  async createInstance(data: CreateInstanceData): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.CREATE_INSTANCE,
    );

    try {
      const response = await axios.post(url, data, {
        headers: EvolutionConfigHelper.getHeaders(),
      });

      this.logger.success(
        `Instancia creada exitosamente: ${data.instanceName}`,
        'Evolution',
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al crear instancia: ${data.instanceName}`,
        'Evolution',
        error.message,
      );
      throw new Error(`Failed to create instance: ${error.message}`);
    }
  }

  async deleteInstance(instanceName: string): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.DELETE_INSTANCE,
      instanceName,
    );

    try {
      const response = await axios.delete(url, {
        headers: EvolutionConfigHelper.getHeaders(),
      });

      this.logger.success(
        `Instancia eliminada exitosamente: ${instanceName}`,
        'Evolution',
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al eliminar instancia: ${instanceName}`,
        'Evolution',
        error.message,
      );
      throw new Error(`Failed to delete instance: ${error.message}`);
    }
  }

  async getAllInstances(): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.FETCH_INSTANCES,
    );

    try {
      const response = await axios.get(url, {
        headers: EvolutionConfigHelper.getHeaders(),
      });

      this.logger.success(
        `Lista de instancias obtenida exitosamente (Total: ${response.data.length})`,
        'Evolution',
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        'Error al obtener lista de instancias',
        'Evolution',
        error.message,
      );
      throw new Error(`Failed to get instances list: ${error.message}`);
    }
  }

  async getInstanceQr(instanceName: string, number: string): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.CONNECT_INSTANCE,
      instanceName,
    );

    try {
      const response = await axios.get(
        `${url}?number=${encodeURIComponent(number)}`,
        {
          headers: EvolutionConfigHelper.getHeaders(),
        },
      );

      this.logger.log(
        `QR obtenido para instancia: ${instanceName} con número: ${number}`,
        'Evolution',
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al obtener QR de instancia: ${instanceName}`,
        'Evolution',
        error.message,
      );
      throw new Error(`Failed to get instance QR: ${error.message}`);
    }
  }

  async getInstanceConnectionState(instanceName: string): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.CONNECTION_STATE,
      instanceName,
    );

    try {
      const response = await axios.get(url, {
        headers: EvolutionConfigHelper.getHeaders(),
      });

      this.logger.success(
        `Estado de conexión obtenido: ${instanceName} - ${response.data.state || 'unknown'}`,
        'Evolution',
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al obtener estado de conexión: ${instanceName}`,
        'Evolution',
        error.message,
      );
      throw new Error(
        `Failed to get instance connection state: ${error.message}`,
      );
    }
  }

  async restartInstance(instanceName: string): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.RESTART_INSTANCE,
      instanceName,
    );

    try {
      const response = await axios.post(
        url,
        {},
        {
          headers: EvolutionConfigHelper.getHeaders(),
        },
      );

      this.logger.success(
        `Instancia reiniciada exitosamente: ${instanceName}`,
        'Evolution',
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al reiniciar instancia: ${instanceName}`,
        'Evolution',
        error.message,
      );
      throw new Error(`Failed to restart instance: ${error.message}`);
    }
  }

  async validateAndRestartInstance(instanceName: string): Promise<any> {
    try {
      this.logger.log(
        `Iniciando validación de instancia: ${instanceName}`,
        'Evolution',
      );

      // Obtener la instancia específica
      const instance = await this.getInstanceByName(instanceName);

      if (!instance) {
        this.logger.log(
          `Instancia no encontrada: ${instanceName}`,
          'Evolution',
        );
        return {
          message: `Instance ${instanceName} not found`,
          instanceName,
          restarted: false,
        };
      }

      if (!instance.profileName || instance.profileName === null) {
        this.logger.log(
          `Instancia con profileName null detectada: ${instanceName}`,
          'Evolution',
        );

        try {
          await this.restartInstance(instanceName);

          this.logger.success(
            `Instancia reiniciada exitosamente: ${instanceName}`,
            'Evolution',
          );

          return {
            message: `Instance ${instanceName} restarted successfully`,
            instanceName,
            restarted: true,
            reason: 'profileName was null',
          };
        } catch (restartError) {
          this.logger.error(
            `Error al reiniciar instancia ${instanceName}`,
            'Evolution',
            restartError.message,
          );

          return {
            message: `Failed to restart instance ${instanceName}`,
            instanceName,
            restarted: false,
            error: restartError.message,
          };
        }
      } else {
        this.logger.success(
          `Instancia con profileName válido: ${instanceName} - ${instance.profileName}`,
          'Evolution',
        );

        return {
          message: `Instance ${instanceName} has valid profileName`,
          instanceName,
          restarted: false,
          profileName: instance.profileName,
          reason: 'profileName is valid',
        };
      }
    } catch (error) {
      this.logger.error(
        `Error durante la validación de instancia: ${instanceName}`,
        'Evolution',
        error.message,
      );

      return {
        message: `Failed to validate instance ${instanceName}`,
        instanceName,
        restarted: false,
        error: error.message,
      };
    }
  }

  async getPrimaryInstanceForUser(userId: string): Promise<any> {
    try {
      this.logger.log(
        `[GET_PRIMARY_INSTANCE_DEBUG] Buscando instancia primaria para usuario: ${userId}`,
        'Evolution',
      );

      const user = await this.userService.findById(userId);

      if (!user || !user.evolutionInstances) {
        this.logger.error(
          `[GET_PRIMARY_INSTANCE_ERROR] Usuario no encontrado o sin instancias`,
          'Evolution',
          {
            userId,
            userExists: !!user,
            hasInstances: !!user?.evolutionInstances,
          },
        );
        throw new Error('User not found or no instances available');
      }

      this.logger.log(
        `[GET_PRIMARY_INSTANCE_DEBUG] Usuario encontrado con ${user.evolutionInstances.length} instancias`,
        'Evolution',
        {
          userId,
          instancesCount: user.evolutionInstances.length,
          instances: user.evolutionInstances.map((inst) => ({
            id: inst.id,
            name: inst.name,
            isPrimary: inst.isPrimary,
            connectionStatus: inst.connectionStatus,
          })),
        },
      );

      const primaryInstance = user.evolutionInstances.find(
        (instance) => instance.isPrimary === true,
      );

      if (!primaryInstance) {
        const firstInstance = user.evolutionInstances[0];
        if (!firstInstance) {
          this.logger.error(
            `[GET_PRIMARY_INSTANCE_ERROR] No hay instancias disponibles`,
            'Evolution',
            { userId },
          );
          throw new Error('No instances available for this user');
        }

        this.logger.log(
          `[GET_PRIMARY_INSTANCE_DEBUG] No hay instancia primaria, usando la primera disponible`,
          'Evolution',
          {
            userId,
            selectedInstance: {
              id: firstInstance.id,
              name: firstInstance.name,
              connectionStatus: firstInstance.connectionStatus,
            },
          },
        );

        return firstInstance;
      }

      this.logger.log(
        `[GET_PRIMARY_INSTANCE_DEBUG] Instancia primaria encontrada`,
        'Evolution',
        {
          userId,
          primaryInstance: {
            id: primaryInstance.id,
            name: primaryInstance.name,
            connectionStatus: primaryInstance.connectionStatus,
          },
        },
      );

      return primaryInstance;
    } catch (error: any) {
      this.logger.error(
        `[GET_PRIMARY_INSTANCE_ERROR] Error al obtener instancia primaria`,
        'Evolution',
        {
          userId,
          errorMessage: error.message,
          fullError: error,
        },
      );
      throw new Error(`Failed to get primary instance: ${error.message}`);
    }
  }

  async updateInstanceSettings(
    instanceName: string,
    settings: UpdateInstanceSettingsData,
  ): Promise<any> {
    const url = EvolutionConfigHelper.buildUrl(
      EvolutionConfigHelper.ENDPOINTS.UPDATE_SETTINGS,
      instanceName,
    );

    try {
      const response = await axios.post(url, settings, {
        headers: EvolutionConfigHelper.getHeaders(),
      });

      this.logger.success(
        `Configuraciones de instancia actualizadas: ${instanceName}`,
        'Evolution',
      );

      this.logger.log(
        `Nuevas configuraciones: ${JSON.stringify(settings)}`,
        'Evolution',
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al actualizar configuraciones de instancia: ${instanceName}`,
        'Evolution',
        error.message,
      );
      throw new Error(`Failed to update instance settings: ${error.message}`);
    }
  }

  async toggleAlwaysOnline(
    instanceName: string,
    enabled: boolean,
  ): Promise<any> {
    return this.updateInstanceSettings(instanceName, { alwaysOnline: enabled });
  }

  async toggleRejectCall(
    instanceName: string,
    enabled: boolean,
    msgCall?: string,
  ): Promise<any> {
    const settings: UpdateInstanceSettingsData = { rejectCall: enabled };
    if (msgCall) {
      settings.msgCall = msgCall;
    }
    return this.updateInstanceSettings(instanceName, settings);
  }

  async toggleGroupsIgnore(
    instanceName: string,
    enabled: boolean,
  ): Promise<any> {
    return this.updateInstanceSettings(instanceName, { groupsIgnore: enabled });
  }

  async toggleReadMessages(
    instanceName: string,
    enabled: boolean,
  ): Promise<any> {
    return this.updateInstanceSettings(instanceName, { readMessages: enabled });
  }

  async toggleReadStatus(instanceName: string, enabled: boolean): Promise<any> {
    return this.updateInstanceSettings(instanceName, { readStatus: enabled });
  }

  async toggleSyncFullHistory(
    instanceName: string,
    enabled: boolean,
  ): Promise<any> {
    return this.updateInstanceSettings(instanceName, {
      syncFullHistory: enabled,
    });
  }

  async setWebSocketConfig(
    instanceName: string,
    websocketConfig: {
      enabled?: boolean;
      events?: string[];
    },
  ): Promise<any> {
    const baseUrl = this.configService.getEvolutionApiUrl();
    const url = `${baseUrl}${EvolutionConfigHelper.ENDPOINTS.SET_WEBSOCKET}/${instanceName}`;

    // Preestablecer eventos si no se pasan
    const defaultEvents = [
      'CHATS_SET',
      'CHATS_UPDATE',
      'CHATS_UPSERT',
      'MESSAGES_DELETE',
      'MESSAGES_SET',
      'MESSAGES_UPDATE',
      'MESSAGES_UPSERT',
      'SEND_MESSAGE',
    ];
    if (
      !websocketConfig.events ||
      !Array.isArray(websocketConfig.events) ||
      websocketConfig.events.length === 0
    ) {
      websocketConfig.events = defaultEvents;
    }

    // Log de depuración para la petición al microservicio Evolution
    const payload = { websocket: websocketConfig };

    this.logger.log(
      'Petición a Evolution API - setWebSocketConfig',
      'EvolutionService',
      {
        url,
        headers: {
          'Content-Type': 'application/json',
          apikey: this.configService.getEvolutionApiKey(),
        },
        body: payload,
      },
    );

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          apikey: this.configService.getEvolutionApiKey(),
        },
      });

      this.logger.success(
        `Configuración de WebSocket actualizada para instancia: ${instanceName}`,
        'Evolution',
        { websocketConfig },
      );

      // Guardar hasWebSocket en la instancia correspondiente
      const user =
        await this.userService.findOneByEvolutionInstanceName(instanceName);
      if (
        user &&
        user.evolutionInstances &&
        Array.isArray(user.evolutionInstances)
      ) {
        const updatedInstances = user.evolutionInstances.map((instance) => {
          if (
            instance.name === instanceName ||
            instance.id === instanceName ||
            instance.evolutionId === instanceName
          ) {
            return {
              ...instance,
              hasWebSocket: !!websocketConfig.enabled,
            };
          }
          return instance;
        });
        await this.userService.setUserEvolutionInstances(
          user.id.toString(),
          updatedInstances,
        );

        // Lógica para uwebsockets
        if (typeof websocketConfig.enabled === 'boolean') {
          if (websocketConfig.enabled) {
            // Agregar o actualizar el uwebsocket
            await this.uWebSocketModel.findOneAndUpdate(
              { userId: user.id.toString(), instanceName },
              {
                userId: user.id.toString(),
                instanceName,
                enabled: true,
                events: websocketConfig.events || [],
              },
              { upsert: true, new: true },
            );
          } else {
            // Eliminar el uwebsocket
            await this.uWebSocketModel.deleteOne({
              userId: user.id.toString(),
              instanceName,
            });
          }
        }
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al configurar WebSocket para instancia: ${instanceName}`,
        'Evolution',
        {
          error: error.message,
          websocketConfig,
          response: error.response?.data,
        },
      );
      throw new Error(`Failed to set websocket config: ${error.message}`);
    }
  }
}
