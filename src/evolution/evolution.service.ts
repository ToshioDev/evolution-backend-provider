import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EvolutionService {
  private readonly baseUrl = 'https://alphanet-evolution-api.pulse.lat/message';

  async sendAudio(audio: string): Promise<any> {
    const url = `${this.baseUrl}/sendWhatsAppAudio/Recepcion Alphanet`;
    try {
      const response = await axios.post(
        url,
        { audio },
        {
          headers: {
            apiKey: process.env.EVOLUTION_API_KEY || '',
          },
        }
      );
      return response.data;
    } catch (error) {
      // Log de error con branding y color
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const colors = require('colors');
      const brand = colors.bgBlue(colors.white(colors.bold(' WhatHub '))) + colors.bgGreen(colors.white(colors.bold(' GateWay ')));
      console.error(brand, colors.red('Error al enviar audio:'), colors.yellow(error.message));
      throw new Error(`Failed to send audio: ${error.message}`);
    }
  }

  // Implementación interna de OAuth para /leadconnector/oauth
  async handleLeadConnectorOAuth(body: any): Promise<any> {
    // Aquí va la lógica interna de OAuth.
    // Por ahora, solo retornamos el body recibido como ejemplo.
    // Reemplaza esto con la lógica real según los requerimientos de OAuth.
    return {
      message: 'OAuth logic not implemented yet. Replace with actual logic.',
      received: body,
    };
  }

  async sendMessageToEvolution(type: 'audio' | 'text' | 'image', target: string, content: string): Promise<any> {
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
    const url = `${this.baseUrl}/sendWhatsapp/Recepcion Alphanet`;
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
        }
      );
      return response.data;
    } catch (error) {
      // Log de error con branding y color
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const colors = require('colors');
      const brand = colors.bgBlue(colors.white(colors.bold(' WhatHub '))) + colors.bgGreen(colors.white(colors.bold(' GateWay ')));
      console.error(brand, colors.red('Error al enviar imagen:'), colors.yellow(error.message));
      throw new Error(`Failed to send image: ${error.message}`);
    }
  }

  async sendMessage(number: string, text: string): Promise<any> {
    const url = `${this.baseUrl}/sendText/Recepcion Alphanet`;
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
        }
      );
      return response.data;
    } catch (error) {
      // Log de error con branding y color
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const colors = require('colors');
      const brand = colors.bgBlue(colors.white(colors.bold(' WhatHub '))) + colors.bgGreen(colors.white(colors.bold(' GateWay ')));
      console.error(brand, colors.red('Error al enviar mensaje:'), colors.yellow(error.message));
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }
}
