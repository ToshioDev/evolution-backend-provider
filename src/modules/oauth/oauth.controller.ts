import {
  Controller,
  Post,
  Body,
  Headers,
  Res,
  HttpStatus,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OauthService } from './oauth.service';
import { ConfigHelper } from '../../common';

@Controller('oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get()
  async oauthRedirect(@Req() req, @Res() res) {
    try {
      const url = ConfigHelper.buildOAuthUrl();
      return res.redirect(url);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  @Get('callback')
  async oauthCallback(@Req() req, @Res() res) {
    const code = req.query.code;
    if (!code) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: 'error',
        message: 'No code parameter received in callback',
      });
    }
    try {
      await this.oauthService.getAccessToken(code);
      const frontendUrl = ConfigHelper.getFrontendUrl();
      return res.redirect(frontendUrl);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  @Get('token')
  async getToken(@Req() req, @Res() res) {
    const code = req.query.code;
    const user_type = req.query.user_type;
    if (!code) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: 'error', message: 'Missing code parameter' });
    }
    try {
      const tokenData = await this.oauthService.getAccessToken(code);
      return res
        .status(HttpStatus.OK)
        .json({ status: 'success', data: tokenData });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ status: 'error', message: error.message });
    }
  }

  @Post()
  async leadConnectorOAuth(
    @Body() body: any,
    @Headers('Authorization') authHeader: string,
    @Res() res,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ status: 'error', message: 'Unauthorized' });
    }
    try {
      const result = await this.oauthService.handleLeadConnectorOAuth(body);
      return res
        .status(HttpStatus.OK)
        .json({ status: 'success', data: result });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ status: 'error', message: error.message });
    }
  }

  @Post('refresh-tokens')
  async refreshAllTokens(@Res() res) {
    try {
      await this.oauthService.checkAndRefreshExpiredTokens();
      return res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Verificación de tokens completada',
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  @Post('refresh-token/:locationId')
  async refreshTokenForUser(@Req() req, @Res() res) {
    const { locationId } = req.params;
    try {
      const updatedAuth =
        await this.oauthService.refreshTokenForUser(locationId);
      return res.status(HttpStatus.OK).json({
        status: 'success',
        message: `Token renovado para usuario con locationId: ${locationId}`,
        data: updatedAuth,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  @Get('token-status')
  async getTokenStatus(@Res() res) {
    try {
      const tokenStatus = await this.oauthService.getTokenStatusForAllUsers();

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: tokenStatus,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  @Get('validate-expiration')
  async validateTokenExpiration(@Res() res) {
    try {
      const createdAt = new Date('2025-07-12T21:57:53.381+00:00');
      const expiresIn = 86399;

      const validation = await this.oauthService.validateTokenExpiration(
        createdAt,
        expiresIn,
      );

      return res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Validación de cálculo de expiración',
        data: validation,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }
}
