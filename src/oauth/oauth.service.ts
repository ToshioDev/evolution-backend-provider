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
          const createdAt = new Date();
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
            created_at: createdAt,
            expires_at: this.calculateExpirationFromCreatedDate(
              createdAt,
              tokenData.expires_in,
            ),
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

  private calculateExpirationDate(expiresIn: number, baseDate?: Date): Date {
    const base = baseDate || new Date();
    return new Date(base.getTime() + expiresIn * 1000);
  }

  private calculateExpirationFromCreatedDate(
    createdAt: Date,
    expiresIn: number,
  ): Date {
    return new Date(createdAt.getTime() + expiresIn * 1000);
  }

  private isTokenExpiredOrExpiringSoon(
    expiresAt: Date,
    bufferMinutes = 10,
  ): boolean {
    const now = new Date();
    const bufferTime = bufferMinutes * 60 * 1000; 
    return expiresAt.getTime() <= now.getTime() + bufferTime;
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    const client_id = process.env.GHL_CLIENT_ID;
    const client_secret = process.env.GHL_CLIENT_SECRET;
    const grant_type = 'refresh_token';

    const params = new URLSearchParams();
    params.append('client_id', client_id || '');
    params.append('client_secret', client_secret || '');
    params.append('grant_type', grant_type);
    params.append('refresh_token', refreshToken);

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

      return response.data;
    } catch (error) {
      const colors = require('colors');
      const brand =
        colors.bgBlue(colors.white(colors.bold(' WhatHub '))) +
        colors.bgGreen(colors.white(colors.bold(' GateWay ')));
      console.error(brand, colors.red('Error al renovar token de GHL:'), {
        sent_params: Object.fromEntries(params.entries()),
        response_data: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });
      throw new Error(
        `GHL Token Refresh Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
      );
    }
  }

  async checkAndRefreshExpiredTokens(): Promise<void> {
    try {
      const colors = require('colors');
      const brand =
        colors.bgBlue(colors.white(colors.bold(' WhatHub '))) +
        colors.bgGreen(colors.white(colors.bold(' GateWay ')));

      console.log(brand, colors.cyan('Verificando tokens expirados...'));

      const users = await this.userService.getAllUsersWithGhlAuth();

      for (const user of users) {
        if (user.ghlAuth && user.ghlAuth.refresh_token) {
          let shouldRefresh = false;

          if (
            !user.ghlAuth.expires_at &&
            user.ghlAuth.created_at &&
            user.ghlAuth.expires_in
          ) {
            const expirationDate = new Date(
              user.ghlAuth.created_at.getTime() +
                user.ghlAuth.expires_in * 1000,
            );
            shouldRefresh = this.isTokenExpiredOrExpiringSoon(expirationDate);
          } else if (user.ghlAuth.expires_at) {
            shouldRefresh = this.isTokenExpiredOrExpiringSoon(
              user.ghlAuth.expires_at,
            );
          } else {
            shouldRefresh = true;
          }

          if (shouldRefresh) {
            try {
              console.log(
                brand,
                colors.yellow(
                  `Token expirado/por expirar para usuario con locationId: ${user.locationId}. Renovando...`,
                ),
              );

              const tokenData = await this.refreshAccessToken(
                user.ghlAuth.refresh_token,
              );

              const createdAt = new Date();
              const updatedGhlAuth: GhlAuth = {
                ...user.ghlAuth,
                access_token: tokenData.access_token,
                token_type: tokenData.token_type || user.ghlAuth.token_type,
                expires_in: tokenData.expires_in,
                refresh_token:
                  tokenData.refresh_token || user.ghlAuth.refresh_token,
                scope: tokenData.scope || user.ghlAuth.scope,
                refreshTokenId:
                  tokenData.refreshTokenId || user.ghlAuth.refreshTokenId,
                created_at: createdAt,
                expires_at: this.calculateExpirationFromCreatedDate(
                  createdAt,
                  tokenData.expires_in,
                ),
              };

              await this.userService.updateGhlAuthByLocationId(
                user.locationId,
                updatedGhlAuth,
              );

              console.log(
                brand,
                colors.green(
                  `Token renovado exitosamente para usuario con locationId: ${user.locationId}`,
                ),
              );
            } catch (refreshError) {
              console.error(
                brand,
                colors.red(
                  `Error al renovar token para usuario con locationId ${user.locationId}:`,
                  refreshError.message,
                ),
              );
            }
          }
        }
      }
    } catch (error) {
      const colors = require('colors');
      const brand =
        colors.bgBlue(colors.white(colors.bold(' WhatHub '))) +
        colors.bgGreen(colors.white(colors.bold(' GateWay ')));
      console.error(
        brand,
        colors.red('Error en la verificación de tokens:'),
        error.message,
      );
    }
  }

  async refreshTokenForUser(locationId: string): Promise<any> {
    try {
      const user = await this.userService.findByLocationId(locationId);

      if (!user || !user.ghlAuth || !user.ghlAuth.refresh_token) {
        throw new Error(
          `Usuario no encontrado o sin refresh token para locationId: ${locationId}`,
        );
      }

      const tokenData = await this.refreshAccessToken(
        user.ghlAuth.refresh_token,
      );

      const createdAt = new Date();
      const updatedGhlAuth: GhlAuth = {
        ...user.ghlAuth,
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || user.ghlAuth.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token || user.ghlAuth.refresh_token,
        scope: tokenData.scope || user.ghlAuth.scope,
        refreshTokenId: tokenData.refreshTokenId || user.ghlAuth.refreshTokenId,
        created_at: createdAt,
        expires_at: this.calculateExpirationFromCreatedDate(
          createdAt,
          tokenData.expires_in,
        ),
      };

      await this.userService.updateGhlAuthByLocationId(
        locationId,
        updatedGhlAuth,
      );

      const colors = require('colors');
      const brand =
        colors.bgBlue(colors.white(colors.bold(' WhatHub '))) +
        colors.bgGreen(colors.white(colors.bold(' GateWay ')));
      console.log(
        brand,
        colors.green(
          `Token renovado manualmente para usuario con locationId: ${locationId}`,
        ),
      );

      return updatedGhlAuth;
    } catch (error) {
      const colors = require('colors');
      const brand =
        colors.bgBlue(colors.white(colors.bold(' WhatHub '))) +
        colors.bgGreen(colors.white(colors.bold(' GateWay ')));
      console.error(
        brand,
        colors.red(`Error al renovar token para usuario ${locationId}:`),
        error.message,
      );
      throw error;
    }
  }

  async getTokenStatusForAllUsers(): Promise<any[]> {
    const users = await this.userService.getAllUsersWithGhlAuth();
    return users
      .map((user) => {
        if (!user.ghlAuth) return null;

        const now = new Date();
        let isExpired = false;
        let expiresIn: number | null = null;

        if (user.ghlAuth.expires_at) {
          isExpired = user.ghlAuth.expires_at < now;
          expiresIn = Math.max(
            0,
            Math.floor(
              (user.ghlAuth.expires_at.getTime() - now.getTime()) / 1000,
            ),
          );
        } else if (user.ghlAuth.created_at && user.ghlAuth.expires_in) {
          const expirationDate = new Date(
            user.ghlAuth.created_at.getTime() + user.ghlAuth.expires_in * 1000,
          );
          isExpired = expirationDate < now;
          expiresIn = Math.max(
            0,
            Math.floor((expirationDate.getTime() - now.getTime()) / 1000),
          );
        }

        return {
          locationId: user.locationId,
          username: user.username,
          hasRefreshToken: !!user.ghlAuth.refresh_token,
          isExpired,
          expiresIn,
          expiresAt: user.ghlAuth.expires_at,
          createdAt: user.ghlAuth.created_at,
        };
      })
      .filter((status) => status !== null);
  }

  validateTokenExpiration(
    createdAt: Date,
    expiresIn: number,
  ): {
    created_at: string;
    expires_in: number;
    calculated_expires_at: string;
    expires_at_timestamp: number;
    current_time: string;
    time_until_expiry_seconds: number;
    is_expired: boolean;
  } {
    const expiresAt = this.calculateExpirationFromCreatedDate(
      createdAt,
      expiresIn,
    );
    const now = new Date();
    const timeUntilExpiry = Math.floor(
      (expiresAt.getTime() - now.getTime()) / 1000,
    );

    return {
      created_at: createdAt.toISOString(),
      expires_in: expiresIn,
      calculated_expires_at: expiresAt.toISOString(),
      expires_at_timestamp: expiresAt.getTime(),
      current_time: now.toISOString(),
      time_until_expiry_seconds: timeUntilExpiry,
      is_expired: expiresAt < now,
    };
  }
}
