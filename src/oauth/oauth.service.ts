import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { GhlAuth } from '../user/user.schema';
import axios from 'axios';

@Injectable()
export class OauthService {
  constructor(private readonly userService: UserService) {}

  async handleLeadConnectorOAuth(body: any): Promise<any> {
    return {
      message: 'OAuth logic not implemented yet. Replace with actual logic.',
      received: body,
    };
  }

  async getAccessToken(code: string): Promise<any> {
    const client_id = process.env.GHL_CLIENT_ID;
    const client_secret = process.env.GHL_CLIENT_SECRET;
    const redirect_uri = 'http://localhost:3000/oauth/callback';
    const grant_type = 'authorization_code';

    const params = new URLSearchParams();
    params.append('client_id', client_id || '');
    params.append('client_secret', client_secret || '');
    params.append('grant_type', grant_type);
    params.append('code', code);
    params.append('redirect_uri', redirect_uri);
    params.append('user_type', 'Location');

    try {
      const response = await axios.post(
        'https://services.leadconnectorhq.com/oauth/token',
        params,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const tokenData = response.data;

      // Si hay locationId en el tokenData, actualizar el usuario correspondiente
      if (tokenData.locationId) {
        try {
          const ghlAuth: GhlAuth = {
            access_token: tokenData.access_token,
            token_type: tokenData.token_type,
            expires_in: tokenData.expires_in,
            refresh_token: tokenData.refresh_token,
            scope: tokenData.scope,
            refreshTokenId: tokenData.refreshTokenId,
            userType: tokenData.userType || 'Location',
            companyId: tokenData.companyId,
            locationId: tokenData.locationId,
            isBulkInstallation: tokenData.isBulkInstallation,
            userId: tokenData.userId,
          };

          await this.userService.updateGhlAuthByLocationId(
            tokenData.locationId,
            ghlAuth,
          );

          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const colors = require('colors');
          const brand =
            colors.bgBlue(colors.white(colors.bold(' WhatHub '))) +
            colors.bgGreen(colors.white(colors.bold(' GateWay ')));
          console.log(
            brand,
            colors.green(
              `GHL Auth actualizado para usuario con locationId: ${tokenData.locationId}`,
            ),
          );
        } catch (userError) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const colors = require('colors');
          const brand =
            colors.bgBlue(colors.white(colors.bold(' WhatHub '))) +
            colors.bgGreen(colors.white(colors.bold(' GateWay ')));
          console.warn(
            brand,
            colors.yellow(
              `No se pudo actualizar el usuario con locationId ${tokenData.locationId}:`,
              userError.message,
            ),
          );
        }
      }

      return tokenData;
    } catch (error) {

      const colors = require('colors');
      const brand =
        colors.bgBlue(colors.white(colors.bold(' WhatHub '))) +
        colors.bgGreen(colors.white(colors.bold(' GateWay ')));
      console.error(brand, colors.red('Error al solicitar token a GHL:'), {
        sent_params: Object.fromEntries(params.entries()),
        response_data: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });
      throw new Error(
        `GHL Token Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
      );
    }
  }
}
