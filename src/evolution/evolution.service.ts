import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as colors from 'colors';

interface CreateInstanceData {
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

import { UserService } from '../user/user.service';

@Injectable()
export class EvolutionService {
  private readonly baseUrl = process.env.EVOLUTION_API_URL || '';

  constructor(private readonly userService: UserService) {}

  async sendAudio(audio: string, instanceName: string): Promise<any> {
    const url = `${this.baseUrl}/message/sendWhatsAppAudio/${instanceName}`;
    try {
      const response = await axios.post(
        url,
        { audio },
        {
          headers: {
            apiKey: process.env.EVOLUTION_API_KEY || '',
          },
        },
      );
      return response.data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al enviar audio:'),
        colors.yellow(error.message),
      );
      throw new Error(`Failed to send audio: ${error.message}`);
    }
  }

  async sendMessageToEvolution(
    type: 'audio' | 'text' | 'image',
    target: string,
    content: string,
    userId: string,
  ): Promise<any> {
    console.log('[DEBUG] sendMessageToEvolution called with:', { type, target, content, userId });

    const primaryInstance = await this.getPrimaryInstanceForUser(userId);
    const instanceName = primaryInstance.instanceName;

    switch (type) {
      case 'audio':
        return this.sendAudio(content, instanceName);
      case 'text':
        return this.sendMessage(target, content, instanceName);
      case 'image':
        return this.sendImage(target, content, instanceName);
      default:
        throw new Error('Unsupported message type');
    }
  }

  async sendImage(
    number: string,
    media: string,
    instanceName: string,
  ): Promise<any> {
    const url = `${this.baseUrl}/message/sendWhatsapp/${instanceName}`;
    try {
      const response = await axios.post(
        url,
        {
          number,
          mediatype: 'image',
          media,
        },
        {
          headers: {
            apiKey: process.env.EVOLUTION_API_KEY || '',
          },
        },
      );
      return response.data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al enviar imagen:'),
        colors.yellow(error.message),
      );
      throw new Error(`Failed to send image: ${error.message}`);
    }
  }

  async sendMessage(
    number: string,
    text: string,
    instanceName: string,
  ): Promise<any> {
    const url = `${this.baseUrl}/message/sendText/${instanceName}`;
    try {
      const response = await axios.post(
        url,
        {
          number,
          text,
        },
        {
          headers: {
            apiKey: process.env.EVOLUTION_API_KEY || '',
          },
        },
      );
      return response.data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al enviar mensaje:'),
        colors.yellow(error.message),
      );
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async createBasicInstance(userId: string, number?: string): Promise<any> {
    let instanceName: string;
    if (number) {
      const cleanNumber = number.replace(/\D/g, '');
      const shortNumber = cleanNumber.slice(-8);
      instanceName = `wh_${shortNumber}`;
    } else {
      const randomId = Math.random().toString(36).substring(2, 7);
      instanceName = `wh_${randomId}`;
    }

    const basicData: CreateInstanceData = {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    };

    if (number) {
      basicData.number = number;
    }

    const brand =
      colors.bgBlue.white.bold(' WhatHub ') +
      colors.bgGreen.white.bold(' GateWay ');
    console.log(
      brand,
      colors.blue('Generando instancia con nombre único:'),
      colors.cyan(instanceName),
    );

    // Update user with new instance
    const updateResult = await this.userService.updateUserEvolutionInstances(
      userId,
      {
        id: instanceName,
        name: instanceName,
        connectionStatus: 'pending',
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
    const url = `${this.baseUrl}/instance/fetchInstances`;
    try {
      const response = await axios.get(url, {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY || '',
        },
        params: {
          instanceName,
        },
      });

      const data = response.data;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error(`Instance ${instanceName} not found`);
      }

      if (Array.isArray(data)) {
        return data[0];
      }
      return data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al obtener información de instancia:'),
        colors.yellow(error.message),
      );
      throw new Error(`Failed to get instance by name: ${error.message}`);
    }
  }

  async createInstance(data: CreateInstanceData): Promise<any> {
    const url = `${this.baseUrl}/instance/create`;
    try {
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.EVOLUTION_API_KEY || '',
        },
      });

      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.log(
        brand,
        colors.green('Instancia creada exitosamente:'),
        colors.cyan(data.instanceName),
      );

      return response.data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al crear instancia:'),
        colors.yellow(error),
      );
      throw new Error(`Failed to create instance: ${error.message}`);
    }
  }

  async deleteInstance(instanceName: string): Promise<any> {
    const url = `${this.baseUrl}/instance/delete/${instanceName}`;
    try {
      const response = await axios.delete(url, {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY || '',
        },
      });

      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.log(
        brand,
        colors.green('Instancia eliminada exitosamente:'),
        colors.cyan(instanceName),
      );

      return response.data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al eliminar instancia:'),
        colors.yellow(error.message),
      );
      throw new Error(`Failed to delete instance: ${error.message}`);
    }
  }

  async getAllInstances(): Promise<any> {
    const url = `${this.baseUrl}/instance/fetchInstances`;
    try {
      const response = await axios.get(url, {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY || '',
        },
      });

      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.log(
        brand,
        colors.green('Lista de instancias obtenida exitosamente'),
        colors.cyan(`Total: ${response.data.length} instancias`),
      );

      return response.data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al obtener lista de instancias:'),
        colors.yellow(error.message),
      );
      throw new Error(`Failed to get instances list: ${error.message}`);
    }
  }

  async getInstanceQr(instanceName: string, number: string): Promise<any> {
    const url = `${this.baseUrl}/instance/connect/${instanceName}?number=${encodeURIComponent(number)}`;
    try {
      const response = await axios.get(url, {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY || '',
        },
      });
      return response.data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al obtener QR de instancia:'),
        colors.yellow(error.message),
      );
      throw new Error(`Failed to get instance QR: ${error.message}`);
    }
  }

  async getInstanceConnectionState(instanceName: string): Promise<any> {
    const url = `${this.baseUrl}/instance/connectionState/${instanceName}`;
    try {
      const response = await axios.get(url, {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY || '',
        },
      });

      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.log(
        brand,
        colors.green('Estado de conexión obtenido:'),
        colors.cyan(`${instanceName} - ${response.data.state || 'unknown'}`),
      );

      return response.data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al obtener estado de conexión:'),
        colors.yellow(error.message),
      );
      throw new Error(
        `Failed to get instance connection state: ${error.message}`,
      );
    }
  }

  async restartInstance(instanceName: string): Promise<any> {
    const url = `${this.baseUrl}/instance/restart/${instanceName}`;
    try {
      const response = await axios.post(
        url,
        {},
        {
          headers: {
            apikey: process.env.EVOLUTION_API_KEY || '',
          },
        },
      );

      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.log(
        brand,
        colors.green('Instancia reiniciada exitosamente:'),
        colors.cyan(instanceName),
      );

      return response.data;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al reiniciar instancia:'),
        colors.yellow(error.message),
      );
      throw new Error(`Failed to restart instance: ${error.message}`);
    }
  }

  async validateAndRestartInstance(instanceName: string): Promise<any> {
    const brand =
      colors.bgBlue.white.bold(' WhatHub ') +
      colors.bgGreen.white.bold(' GateWay ');

    try {
      console.log(
        brand,
        colors.blue('Iniciando validación de instancia:'),
        colors.cyan(instanceName),
      );

      // Obtener la instancia específica
      const instance = await this.getInstanceByName(instanceName);

      if (!instance) {
        console.log(
          brand,
          colors.red('Instancia no encontrada:'),
          colors.cyan(instanceName),
        );
        return {
          message: `Instance ${instanceName} not found`,
          instanceName,
          restarted: false,
        };
      }

      if (!instance.profileName || instance.profileName === null) {
        console.log(
          brand,
          colors.yellow('Instancia con profileName null detectada:'),
          colors.cyan(instanceName),
        );

        try {
          await this.restartInstance(instanceName);

          console.log(
            brand,
            colors.green('Instancia reiniciada exitosamente:'),
            colors.cyan(instanceName),
          );

          return {
            message: `Instance ${instanceName} restarted successfully`,
            instanceName,
            restarted: true,
            reason: 'profileName was null',
          };
        } catch (restartError) {
          console.error(
            brand,
            colors.red(`Error al reiniciar instancia ${instanceName}:`),
            colors.yellow(restartError.message),
          );

          return {
            message: `Failed to restart instance ${instanceName}`,
            instanceName,
            restarted: false,
            error: restartError.message,
          };
        }
      } else {
        console.log(
          brand,
          colors.green('Instancia con profileName válido:'),
          colors.cyan(`${instanceName} - ${instance.profileName}`),
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
      console.error(
        brand,
        colors.red('Error durante la validación de instancia:'),
        colors.yellow(error.message),
      );

      return {
        message: `Failed to validate instance ${instanceName}`,
        instanceName,
        restarted: false,
        error: error.message,
      };
    }
  }

  async getPrimaryInstanceForUser(userIdOrToken: string): Promise<any> {
    try {
      // Check if userIdOrToken is a valid MongoDB ObjectId (24 hex chars)
      const isObjectId = /^[a-f\d]{24}$/i.test(userIdOrToken);
      let user;
      if (isObjectId) {
        user = await this.userService.findById(userIdOrToken);
      } else {
        user = await this.userService.findByUserToken(userIdOrToken);
      }
      if (!user || !user.evolutionInstances) {
        throw new Error('User not found or no instances available');
      }

      const primaryInstance = user.evolutionInstances.find(
        (instance) => instance.isPrimary === true,
      );

      if (!primaryInstance) {
        const firstInstance = user.evolutionInstances[0];
        if (!firstInstance) {
          throw new Error('No instances available for this user');
        }
        return firstInstance;
      }

      return primaryInstance;
    } catch (error) {
      throw new Error(`Failed to get primary instance: ${error.message}`);
    }
  }
}
