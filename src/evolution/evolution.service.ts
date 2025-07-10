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

    const brand =
      colors.bgBlue.white.bold(' WhatHub ') +
      colors.bgGreen.white.bold(' GateWay ');

    // Verificar si la instancia ya existe
    let existingInstance = null;
    try {
      existingInstance = await this.getInstanceByName(instanceName);
      console.log(
        brand,
        colors.yellow('Instancia existente encontrada:'),
        colors.cyan(instanceName),
      );
    } catch (error) {
      console.log(
        brand,
        colors.blue('Instancia no existe, se creará:'),
        colors.cyan(instanceName),
      );
    }

    // Si la instancia existe, verificar si tiene datos de perfil
    if (existingInstance) {
      const instanceData = existingInstance as any;

      // Log detallado de datos de perfil según la estructura de Evolution API
      console.log(
        brand,
        colors.blue('Verificando datos de perfil de la instancia:'),
        colors.cyan(instanceName),
      );
      console.log(
        brand,
        colors.gray('- Instance Name:'),
        colors.white(instanceData.instanceName || 'No definido'),
      );
      console.log(
        brand,
        colors.gray('- Instance ID:'),
        colors.white(instanceData.instanceId || 'No definido'),
      );
      console.log(
        brand,
        colors.gray('- Owner:'),
        colors.white(instanceData.owner || 'No definido'),
      );
      console.log(
        brand,
        colors.gray('- Profile Name:'),
        colors.white(instanceData.profileName || 'No definido'),
      );
      console.log(
        brand,
        colors.gray('- Profile Picture URL:'),
        colors.white(instanceData.profilePictureUrl || 'No definido'),
      );
      console.log(
        brand,
        colors.gray('- Profile Status:'),
        colors.white(instanceData.profileStatus || 'No definido'),
      );
      console.log(
        brand,
        colors.gray('- Connection Status:'),
        colors.white(instanceData.status || 'No definido'),
      );

      // Validación de datos críticos para determinar si está completamente conectada
      const hasCompleteProfileData =
        instanceData.owner &&
        instanceData.owner.trim() !== '' &&
        instanceData.profileName &&
        instanceData.profileName.trim() !== '' &&
        instanceData.status === 'open';

      const hasCriticalData =
        instanceData.instanceId && instanceData.instanceId.trim() !== '';

      if (!hasCompleteProfileData || !hasCriticalData) {
        console.log(
          brand,
          colors.yellow(
            '❌ Instancia sin datos de perfil completos, reiniciando:',
          ),
          colors.cyan(instanceName),
        );

        const missingFields: string[] = [];
        if (!instanceData.owner || instanceData.owner.trim() === '') {
          missingFields.push('owner');
        }
        if (
          !instanceData.profileName ||
          instanceData.profileName.trim() === ''
        ) {
          missingFields.push('profileName');
        }
        if (instanceData.status !== 'open') {
          missingFields.push(
            `status (actual: ${instanceData.status || 'undefined'})`,
          );
        }
        if (!instanceData.instanceId || instanceData.instanceId.trim() === '') {
          missingFields.push('instanceId');
        }

        console.log(
          brand,
          colors.red('Motivos:'),
          colors.yellow(
            `Campos faltantes o vacíos: ${missingFields.join(', ')}`,
          ),
        );

        try {
          await this.restartInstance(instanceName);
          console.log(
            brand,
            colors.green('✅ Instancia reiniciada exitosamente:'),
            colors.cyan(instanceName),
          );
        } catch (restartError) {
          console.log(
            brand,
            colors.red('❌ Error al reiniciar instancia, continuando:'),
            colors.yellow((restartError as any).message),
          );
        }
      } else {
        console.log(
          brand,
          colors.green(
            '✅ Instancia completamente conectada con todos los datos:',
          ),
          colors.cyan(
            `${instanceName} - ${instanceData.profileName} (${instanceData.status})`,
          ),
        );
      }

      // Update user with existing instance info
      const updateResult = await this.userService.updateUserEvolutionInstances(
        userId,
        {
          id: instanceName,
          name: instanceName,
          connectionStatus: instanceData.status || 'unknown',
          ownerJid: instanceData.owner || '',
          token: instanceData.apikey || '',
        },
      );

      if (!updateResult) {
        throw new Error('Failed to update user with existing instance');
      }

      return existingInstance;
    }

    // Si la instancia no existe, crearla
    const basicData: CreateInstanceData = {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    };

    if (number) {
      basicData.number = number;
    }

    console.log(
      brand,
      colors.blue('Creando nueva instancia:'),
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

      // La API retorna un array de objetos con estructura { instance: {...} }
      if (Array.isArray(data)) {
        const instanceObj = data.find(
          (item) => item.instance?.instanceName === instanceName,
        );
        if (!instanceObj) {
          throw new Error(`Instance ${instanceName} not found in response`);
        }
        return instanceObj.instance; // Retornamos solo el objeto instance
      }

      // Si no es array, verificar si tiene la estructura correcta
      if (data.instance) {
        return data.instance;
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

      // Validar y reiniciar instancias que no tengan datos de perfil completos
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log(
          brand,
          colors.blue(
            '🔍 Iniciando validación de datos de perfil para todas las instancias...',
          ),
        );

        const promises = response.data.map(async (item: any) => {
          if (item.instance) {
            const instanceData = item.instance;
            const instanceName = instanceData.instanceName;

            console.log(
              brand,
              colors.gray(`📋 Validando instancia: ${instanceName}`),
            );

            // Validación de datos críticos
            const hasCompleteProfileData =
              instanceData.owner &&
              instanceData.owner.trim() !== '' &&
              instanceData.profileName &&
              instanceData.profileName.trim() !== '' &&
              instanceData.status === 'open';

            const hasCriticalData =
              instanceData.instanceId && instanceData.instanceId.trim() !== '';

            if (!hasCompleteProfileData || !hasCriticalData) {
              const missingFields: string[] = [];
              if (!instanceData.owner || instanceData.owner.trim() === '') {
                missingFields.push('owner');
              }
              if (
                !instanceData.profileName ||
                instanceData.profileName.trim() === ''
              ) {
                missingFields.push('profileName');
              }
              if (instanceData.status !== 'open') {
                missingFields.push(
                  `status (actual: ${instanceData.status || 'undefined'})`,
                );
              }
              if (
                !instanceData.instanceId ||
                instanceData.instanceId.trim() === ''
              ) {
                missingFields.push('instanceId');
              }

              console.log(
                brand,
                colors.yellow(
                  `❌ ${instanceName} - Datos incompletos, reiniciando...`,
                ),
              );
              console.log(
                brand,
                colors.red(`   Campos faltantes: ${missingFields.join(', ')}`),
              );

              try {
                await this.restartInstance(instanceName);
                console.log(
                  brand,
                  colors.green(`✅ ${instanceName} - Reiniciado exitosamente`),
                );
              } catch (restartError) {
                console.log(
                  brand,
                  colors.red(`❌ ${instanceName} - Error al reiniciar:`),
                  colors.yellow((restartError as any).message),
                );
              }
            } else {
              console.log(
                brand,
                colors.green(
                  `✅ ${instanceName} - Datos completos (${instanceData.profileName})`,
                ),
              );
            }
          }
        });

        // Ejecutar todas las validaciones en paralelo
        await Promise.allSettled(promises);

        console.log(
          brand,
          colors.blue('🔍 Validación de instancias completada'),
        );
      }

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
}
