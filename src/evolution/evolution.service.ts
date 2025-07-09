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

    // Update user with new instance
    const updateResult = await this.userService.updateUserEvolutionInstances(userId, {
      id: instanceName,
      name: instanceName,
      connectionStatus: 'pending',
      ownerJid: '',
      token: '',
    });

    if (!updateResult) {
      throw new Error('Failed to update user with new instance');
    }

    return this.createInstance(basicData);
  }

  async getInstanceInfo(instanceName: string): Promise<any> {
    const url = `${this.baseUrl}/instance/fetchInstances`;
    try {
      const response = await axios.get(url, {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY || '',
        },
      });

      const instances = response.data;
      const instance = instances.find(
        (inst: any) => inst.instance?.instanceName === instanceName,
      );

      if (!instance) {
        throw new Error(`Instance ${instanceName} not found`);
      }

      return instance;
    } catch (error) {
      const brand =
        colors.bgBlue.white.bold(' WhatHub ') +
        colors.bgGreen.white.bold(' GateWay ');
      console.error(
        brand,
        colors.red('Error al obtener información de instancia:'),
        colors.yellow(error.message),
      );
      throw new Error(`Failed to get instance info: ${error.message}`);
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
}
