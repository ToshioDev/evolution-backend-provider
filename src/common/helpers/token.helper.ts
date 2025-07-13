import { Injectable } from '@nestjs/common';
import { DateHelper } from './date.helper';
import { GhlAuth } from 'src/modules/user/user.schema';

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  timeUntilExpiry: number;
  expiresAt: Date | null;
  reason?: string;
}

export interface TokenCalculationResult {
  created_at: string;
  expires_in: number;
  calculated_expires_at: string;
  expires_at_timestamp: number;
  current_time: string;
  time_until_expiry_seconds: number;
  time_until_expiry_formatted: string;
  is_expired: boolean;
  is_expiring_soon: boolean;
}

@Injectable()
export class TokenHelper {
  /**
   * Crea un objeto GhlAuth con fechas calculadas correctamente
   */
  static createGhlAuth(
    tokenData: any,
    baseGhlAuth?: Partial<GhlAuth>,
  ): GhlAuth {
    const createdAt = new Date();

    return {
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
      expires_at: DateHelper.calculateExpirationDate(
        createdAt,
        tokenData.expires_in,
      ),
      ...baseGhlAuth, // Permite override de campos específicos
    };
  }

  /**
   * Actualiza un GhlAuth existente con nuevos datos de token
   */
  static updateGhlAuth(existingGhlAuth: GhlAuth, newTokenData: any): GhlAuth {
    const createdAt = new Date();

    return {
      ...existingGhlAuth,
      access_token: newTokenData.access_token,
      token_type: newTokenData.token_type || existingGhlAuth.token_type,
      expires_in: newTokenData.expires_in,
      refresh_token:
        newTokenData.refresh_token || existingGhlAuth.refresh_token,
      scope: newTokenData.scope || existingGhlAuth.scope,
      refreshTokenId:
        newTokenData.refreshTokenId || existingGhlAuth.refreshTokenId,
      created_at: createdAt,
      expires_at: DateHelper.calculateExpirationDate(
        createdAt,
        newTokenData.expires_in,
      ),
    };
  }

  /**
   * Valida el estado de un token
   */
  static validateToken(
    ghlAuth: GhlAuth,
    bufferMinutes = 10,
  ): TokenValidationResult {
    if (!ghlAuth.refresh_token) {
      return {
        isValid: false,
        isExpired: true,
        isExpiringSoon: false,
        timeUntilExpiry: 0,
        expiresAt: null,
        reason: 'No refresh token available',
      };
    }

    let expiresAt: Date | null = null;

    if (ghlAuth.expires_at && DateHelper.isValidDate(ghlAuth.expires_at)) {
      expiresAt = ghlAuth.expires_at;
    } else if (ghlAuth.created_at && ghlAuth.expires_in) {
      expiresAt = DateHelper.calculateExpirationFromLegacyData(
        ghlAuth.created_at,
        ghlAuth.expires_in,
      );
    }

    if (!expiresAt || expiresAt.getTime() === 0) {
      return {
        isValid: false,
        isExpired: true,
        isExpiringSoon: false,
        timeUntilExpiry: 0,
        expiresAt: null,
        reason: 'Cannot determine expiration date',
      };
    }

    const now = new Date();
    const isExpired = expiresAt < now;
    const isExpiringSoon = DateHelper.isTokenExpiredOrExpiringSoon(
      expiresAt,
      bufferMinutes,
    );
    const timeUntilExpiry = DateHelper.getTimeUntilExpiry(expiresAt);

    return {
      isValid: !isExpired && !isExpiringSoon,
      isExpired,
      isExpiringSoon,
      timeUntilExpiry,
      expiresAt,
    };
  }

  /**
   * Calcula detalles completos de expiración para debugging
   */
  static calculateTokenDetails(
    createdAt: Date,
    expiresIn: number,
  ): TokenCalculationResult {
    const expiresAt = DateHelper.calculateExpirationDate(createdAt, expiresIn);
    const now = new Date();
    const timeUntilExpiry = DateHelper.getTimeUntilExpiry(expiresAt);

    return {
      created_at: createdAt.toISOString(),
      expires_in: expiresIn,
      calculated_expires_at: expiresAt.toISOString(),
      expires_at_timestamp: expiresAt.getTime(),
      current_time: now.toISOString(),
      time_until_expiry_seconds: timeUntilExpiry,
      time_until_expiry_formatted: DateHelper.formatSeconds(timeUntilExpiry),
      is_expired: expiresAt < now,
      is_expiring_soon: DateHelper.isTokenExpiredOrExpiringSoon(expiresAt),
    };
  }

  /**
   * Determina si un token necesita ser renovado
   */
  static shouldRefreshToken(ghlAuth: GhlAuth, bufferMinutes = 10): boolean {
    const validation = this.validateToken(ghlAuth, bufferMinutes);
    return (
      validation.isExpired || validation.isExpiringSoon || !validation.isValid
    );
  }

  /**
   * Obtiene información de estado de token para API responses
   */
  static getTokenStatus(ghlAuth: GhlAuth): {
    locationId: string;
    hasRefreshToken: boolean;
    isExpired: boolean;
    expiresIn: number | null;
    expiresAt: Date | null;
    createdAt: Date | null;
    timeUntilExpiryFormatted: string | null;
  } {
    const validation = this.validateToken(ghlAuth);

    return {
      locationId: ghlAuth.locationId,
      hasRefreshToken: !!ghlAuth.refresh_token,
      isExpired: validation.isExpired,
      expiresIn: validation.timeUntilExpiry,
      expiresAt: validation.expiresAt,
      createdAt: ghlAuth.created_at || null,
      timeUntilExpiryFormatted: validation.expiresAt
        ? DateHelper.formatSeconds(validation.timeUntilExpiry)
        : null,
    };
  }
}
