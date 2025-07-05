import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EvolutionService {
  private readonly baseUrl = 'https://alphanet-evolution-api.pulse.lat/message';

  async sendAudio(audio: string): Promise<any> {
    const url = `${this.baseUrl}/sendWhatsAppAudio/Recepcion Alphanet`;
    try {
      const response = await axios.post(url, { audio });
      return response.data;
    } catch (error) {
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
      const response = await axios.post(url, {
        number,
        mediatype: 'image',
        media,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send image: ${error.message}`);
    }
  }

  async sendMessage(number: string, text: string): Promise<any> {
    const url = `${this.baseUrl}/sendText/Recepcion Alphanet`;
    try {
      const response = await axios.post(url, {
        number,
        text,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }
}
