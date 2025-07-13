import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { GhlAuth } from '../user/user.schema';
import axios from 'axios';
import {
  LoggerService,
  DateHelper,
  TokenHelper,
  ConfigHelper,
  ConfigurationService,
} from '../../common';

@Injectable()
export class OauthService {
  constructor(
    private readonly userService: UserService,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigurationService,
  ) {
    // Validar configuración del módulo OAuth al inicializar
    this.configService.logModuleConfig('oauth');
  }

  async handleLeadConnectorOAuth(body: any): Promise<any> {
    return {
      message: 'OAuth logic not implemented yet. Replace with actual logic.',
      received: body,
    };
  }

  async getAccessToken(code: string): Promise<any> {
    const client_id = this.configService.getGhlClientId();
    const client_secret = this.configService.getGhlClientSecret();
    const redirect_uri = this.configService.getGhlRedirectUri();
    const grant_type = ConfigHelper.GRANT_TYPE_AUTHORIZATION_CODE;

    const params = new URLSearchParams();
    params.append('client_id', client_id);
    params.append('client_secret', client_secret);
    params.append('grant_type', grant_type);
    params.append('code', code);
    params.append('redirect_uri', redirect_uri);
    params.append('user_type', ConfigHelper.DEFAULT_USER_TYPE);

    try {
      const response = await axios.post(ConfigHelper.GHL_TOKEN_URL, params, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokenData = response.data;

      // Si hay locationId en el tokenData, actualizar el usuario correspondiente
      if (tokenData.locationId) {
        try {
          const ghlAuth = TokenHelper.createGhlAuth(tokenData);

          await this.userService.updateGhlAuthByLocationId(
            tokenData.locationId,
            ghlAuth,
          );

          this.loggerService.oauthSuccess(
            'GHL Auth actualizado para usuario',
            tokenData.locationId,
          );
        } catch (userError) {
          this.loggerService.oauthWarning(
            'No se pudo actualizar el usuario',
            tokenData.locationId,
            userError.message,
          );
        }
      }

      return tokenData;
    } catch (error) {
      this.loggerService.ghlApiError(
        'token',
        Object.fromEntries(params.entries()),
        error,
      );
      throw new Error(
        `GHL Token Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
      );
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    const client_id = this.configService.getGhlClientId();
    const client_secret = this.configService.getGhlClientSecret();
    const grant_type = ConfigHelper.GRANT_TYPE_REFRESH_TOKEN;

    const params = new URLSearchParams();
    params.append('client_id', client_id);
    params.append('client_secret', client_secret);
    params.append('grant_type', grant_type);
    params.append('refresh_token', refreshToken);

    try {
      const response = await axios.post(ConfigHelper.GHL_TOKEN_URL, params, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokenData = response.data;

      this.loggerService.oauthSuccess(
        'Token renovado exitosamente',
        tokenData.locationId || 'unknown',
      );

      return tokenData;
    } catch (error) {
      this.loggerService.ghlApiError(
        'refresh-token',
        { refresh_token: refreshToken.substring(0, 10) + '...' },
        error,
      );
      throw new Error(
        `GHL Refresh Token Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
      );
    }
  }

  async checkAndRefreshExpiredTokens(): Promise<{
    checked: number;
    refreshed: number;
    errors: number;
  }> {
    const stats = { checked: 0, refreshed: 0, errors: 0 };

    try {
      const users = await this.userService.getAllUsersWithTokens();
      stats.checked = users.length;

      this.loggerService.tokenRefreshStart();

      for (const user of users) {
        const ghlAuth = user.ghlAuth;
        if (!ghlAuth?.access_token || !ghlAuth?.refresh_token) continue;

        try {
          // Verificar si el token tiene fecha de expiración
          if (!ghlAuth.expires_at) {
            this.loggerService.tokenRefreshWarning(
              user.locationId,
              'Token sin fecha de expiración, renovando por seguridad',
            );

            const refreshedTokenData = await this.refreshAccessToken(
              ghlAuth.refresh_token,
            );

            const updatedGhlAuth =
              TokenHelper.createGhlAuth(refreshedTokenData);

            await this.userService.updateGhlAuthByLocationId(
              user.locationId,
              updatedGhlAuth,
            );

            this.loggerService.tokenRefreshSuccess(user.locationId, 'auto');
            stats.refreshed++;
            continue;
          }

          const tokenInfo = DateHelper.getTokenExpirationInfo(
            ghlAuth.expires_at,
          );

          if (tokenInfo.isExpiringSoon) {
            this.loggerService.tokenRefreshWarning(
              user.locationId,
              `Token expira en ${Math.floor(tokenInfo.timeUntilExpirySeconds / 60)} minutos`,
            );

            const refreshedTokenData = await this.refreshAccessToken(
              ghlAuth.refresh_token,
            );

            const updatedGhlAuth =
              TokenHelper.createGhlAuth(refreshedTokenData);

            await this.userService.updateGhlAuthByLocationId(
              user.locationId,
              updatedGhlAuth,
            );

            this.loggerService.tokenRefreshSuccess(user.locationId, 'auto');
            stats.refreshed++;
          }
        } catch (error) {
          this.loggerService.tokenRefreshError(user.locationId, error);
          stats.errors++;
        }
      }

      this.loggerService.success(
        `Verificación completada: ${stats.refreshed} tokens renovados, ${stats.checked} tokens verificados`,
        'OauthService',
        stats,
      );

      return stats;
    } catch (error) {
      this.loggerService.error(
        'Error durante verificación masiva de tokens',
        'OauthService',
        { error: error.message },
      );
      stats.errors++;
      return stats;
    }
  }

  async manualRefreshToken(locationId: string): Promise<any> {
    try {
      const user = await this.userService.findByLocationId(locationId);
      if (!user?.ghlAuth?.refresh_token) {
        throw new Error('Usuario o refresh token no encontrado');
      }

      const refreshedTokenData = await this.refreshAccessToken(
        user.ghlAuth.refresh_token,
      );

      const updatedGhlAuth = TokenHelper.createGhlAuth(refreshedTokenData);

      await this.userService.updateGhlAuthByLocationId(
        locationId,
        updatedGhlAuth,
      );

      this.loggerService.tokenRefreshSuccess(locationId, 'manual');

      return {
        success: true,
        message: 'Token renovado exitosamente',
        data: refreshedTokenData,
      };
    } catch (error) {
      this.loggerService.tokenRefreshError(locationId, error);
      throw error;
    }
  }

  async refreshTokenForUser(locationId: string): Promise<any> {
    return this.manualRefreshToken(locationId);
  }

  async getTokenStatusForAllUsers(): Promise<any> {
    try {
      const users = await this.userService.getAllUsersWithTokens();
      const tokenStatus: Array<{
        locationId: string;
        username: string;
        email: string;
        tokenStatus: string;
        timeUntilExpiry: number;
        formattedTime: string;
        hasRefreshToken: boolean;
        createdAt: Date | undefined;
        expiresAt: Date | undefined;
      }> = [];

      for (const user of users) {
        const ghlAuth = user.ghlAuth;
        if (!ghlAuth?.access_token) continue;

        let status = 'valid';
        let timeUntilExpiry = 0;
        let formattedTime = 'N/A';

        if (ghlAuth.expires_at) {
          const tokenInfo = DateHelper.getTokenExpirationInfo(
            ghlAuth.expires_at,
          );

          if (tokenInfo.isExpired) {
            status = 'expired';
          } else if (tokenInfo.isExpiringSoon) {
            status = 'expiring_soon';
          }

          timeUntilExpiry = tokenInfo.timeUntilExpirySeconds;
          formattedTime = tokenInfo.timeUntilExpiryFormatted;
        } else {
          status = 'no_expiration_date';
        }

        tokenStatus.push({
          locationId: user.locationId,
          username: user.username,
          email: user.email,
          tokenStatus: status,
          timeUntilExpiry,
          formattedTime,
          hasRefreshToken: !!ghlAuth.refresh_token,
          createdAt: ghlAuth.created_at,
          expiresAt: ghlAuth.expires_at,
        });
      }

      return {
        totalUsers: tokenStatus.length,
        tokensSummary: {
          valid: tokenStatus.filter((t) => t.tokenStatus === 'valid').length,
          expiring_soon: tokenStatus.filter(
            (t) => t.tokenStatus === 'expiring_soon',
          ).length,
          expired: tokenStatus.filter((t) => t.tokenStatus === 'expired')
            .length,
          no_expiration_date: tokenStatus.filter(
            (t) => t.tokenStatus === 'no_expiration_date',
          ).length,
        },
        users: tokenStatus,
      };
    } catch (error) {
      this.loggerService.error(
        'Error obteniendo estado de tokens',
        'OauthService',
        { error: error.message },
      );
      throw error;
    }
  }

  async validateTokenExpiration(
    createdAt: Date,
    expiresIn: number,
  ): Promise<any> {
    try {
      const expiresAt = DateHelper.calculateExpirationDate(
        createdAt,
        expiresIn,
      );
      const tokenInfo = DateHelper.getTokenExpirationInfo(expiresAt);

      return {
        createdAt,
        expiresIn,
        expiresAt,
        currentTime: new Date(),
        validation: {
          isExpired: tokenInfo.isExpired,
          isExpiringSoon: tokenInfo.isExpiringSoon,
          timeUntilExpirySeconds: tokenInfo.timeUntilExpirySeconds,
          timeUntilExpiryFormatted: tokenInfo.timeUntilExpiryFormatted,
          recommendedCheckInterval: tokenInfo.recommendedCheckInterval,
        },
      };
    } catch (error) {
      this.loggerService.error(
        'Error validando expiración de token',
        'OauthService',
        { error: error.message, createdAt, expiresIn },
      );
      throw error;
    }
  }
}
