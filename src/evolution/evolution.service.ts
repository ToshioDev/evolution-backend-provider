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

  async updateEvolutionInstancesForUser(
    userId: string,
    instances: Array<{
      id: string;
      name: string;
      connectionStatus: string;
      ownerJid: string;
      token: string;
      evolutionId: string;
      profileName: string;
    }>,
  ): Promise<boolean> {
    return this.userService.setUserEvolutionInstances(userId, instances);
  }

  async sendAudio(audio: string): Promise<any> {
    const url = `${this.baseUrl}/message/sendWhatsAppAudio/Recepcion Alphanet`;
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
  ): Promise<any> {
    switch (type) {
      case 'audio':
        return this.sendAudio(content);
      case 'text':
        return this.sendMessage(target, content);
      case 'image':
        return this.sendImage(target, content);
      default:
        throw new Error('Unsupported message type');
    }
  }

  async sendImage(number: string, media: string): Promise<any> {
    const url = `${this.baseUrl}/message/sendWhatsapp/Recepcion Alphanet`;
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

  async sendMessage(number: string, text: string): Promise<any> {
    const url = `${this.baseUrl}/message/sendText/Recepcion Alphanet`;
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

    const createResult = await this.createInstance(basicData);

    console.log(
      brand,
      colors.yellow('Esperando 3 segundos antes de verificar la instancia...'),
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const instanceData = await this.getInstanceByName(instanceName);

      if (!instanceData.profileName || instanceData.profileName === null) {
        console.log(
          brand,
          colors.yellow(
            'Instance con profileName null detectada, reiniciando:',
          ),
          colors.cyan(instanceName),
        );

        await this.restartInstance(instanceName);

        console.log(
          brand,
          colors.green('Instancia reiniciada por profileName null:'),
          colors.cyan(instanceName),
        );
      } else {
        console.log(
          brand,
          colors.green('Instance con profileName válido:'),
          colors.cyan(`${instanceName} - ${instanceData.profileName}`),
        );
      }
    } catch (error) {
      console.error(
        brand,
        colors.red('Error al verificar profileName de instancia:'),
        colors.yellow(error.message),
      );
    }

    return createResult;
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
  async getInstanceProfileName(instanceName: string): Promise<string> {
    const instance = await this.getInstanceByName(instanceName);
    if (!instance || !instance.profileName) {
      throw new Error(
        `Instance ${instanceName} not found or has no profileName`,
      );
    }
    return instance.profileName;
  }
}