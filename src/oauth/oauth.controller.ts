import { Controller, Post, Body, Headers, Res, HttpStatus, Get, Req, UseGuards } from '@nestjs/common';
import { OauthService } from './oauth.service';

@Controller('oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get()
  async oauthRedirect(@Req() req, @Res() res) {
    const clientId = process.env.GHL_CLIENT_ID;
    if (!clientId) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ status: 'error', message: 'GHL_CLIENT_ID is not set in environment variables' });
    }
    const redirectUri = 'http://localhost:3000/oauth/callback';
    const scope = process.env.GHL_SCOPES || '';
    const url = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}`;
    return res.redirect(url);
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
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
      return res.status(HttpStatus.BAD_REQUEST).json({ status: 'error', message: 'Missing code parameter' });
    }
    try {
      const tokenData = await this.oauthService.getAccessToken(code);
      return res.status(HttpStatus.OK).json({ status: 'success', data: tokenData });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ status: 'error', message: error.message });
    }
  }

  @Post()
  async leadConnectorOAuth(
    @Body() body: any,
    @Headers('Authorization') authHeader: string,
    @Res() res
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ status: 'error', message: 'Unauthorized' });
    }
    try {
      const result = await this.oauthService.handleLeadConnectorOAuth(body);
      return res.status(HttpStatus.OK).json({ status: 'success', data: result });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ status: 'error', message: error.message });
    }
  }
}
