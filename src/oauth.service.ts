import { Injectable } from '@nestjs/common';

import axios from 'axios';

@Injectable()
export class OauthService {
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

  async getAccessToken(code: string): Promise<any> {
    const client_id = process.env.GHL_CLIENT_ID;
    const client_secret = process.env.GHL_CLIENT_SECRET;
    const redirect_uri = 'http://localhost:3000/';
    const grant_type = 'authorization_code';

    const params = new URLSearchParams();
    params.append('client_id', client_id || '');
    params.append('client_secret', client_secret || '');
    params.append('grant_type', grant_type);
    params.append('code', code);
    params.append('redirect_uri', redirect_uri);
    params.append('user_type', "Location");
    // No enviar scopes en la petición de token según la documentación de GHL

    try {
      const response = await axios.post(
        'https://services.leadconnectorhq.com/oauth/token',
        params,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data;
    } catch (error) {
      // Log detallado para depuración
      console.error('Error al solicitar token a GHL:', {
        sent_params: Object.fromEntries(params.entries()),
        response_data: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });
      throw new Error(
        `GHL Token Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`
      );
    }
  }
}
