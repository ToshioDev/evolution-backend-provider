import { Controller, Post, Body, Headers, Req, Res, HttpStatus } from '@nestjs/common';
import { EvolutionService } from './evolution.service';

@Controller('evolution')
export class EvolutionController {
  constructor(private readonly evolutionService: EvolutionService) {}

  @Post('message')
  async sendMessage(
    @Body('conversationId') conversationId: string,
    @Body('message') message: string,
    @Body('contact') contact: { id: string; phone: string },
    @Body('locationId') locationId: string,
    @Headers('Authorization') authHeader: string,
  ): Promise<{ status: string; message: string }> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { status: 'error', message: 'Unauthorized' };
    }

    const remoteJid = `${contact.phone}@whatsapp.net`;
    try {
      await this.evolutionService.sendMessageToEvolution('text', remoteJid, message);
      return { status: 'success', message: 'Mensaje enviado a Evolution API' };
    } catch (error) {
      return { status: 'error', message: 'Número inválido o error al contactar Evolution API' };
    }
  }
  @Post('/leadconnector/oauth')
  async leadConnectorOAuth(
    @Body() body: any,
    @Headers('Authorization') authHeader: string,
    @Res() res
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ status: 'error', message: 'Unauthorized' });
    }
    try {
      const result = await this.evolutionService.handleLeadConnectorOAuth(body);
      return res.status(HttpStatus.OK).json({ status: 'success', data: result });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ status: 'error', message: error.message });
    }
  }

  handleIncomingMessage(@Body() body: any): string {
    const { remoteJid, instance, message } = body;
    // Aquí puedes procesar el mensaje según el remoteJid y la instancia
    console.log(`Received message from ${remoteJid} on instance ${instance}:`, message);
    return 'Message received';
  }

  @Post('webhook')
  async evolutionWebhook(@Body() body: any, @Res() res) {
    // Loguear el payload recibido con branding y color
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const colors = require('colors');
    const brand = colors.bgBlue(colors.white(colors.bold(' WhatHub '))) + colors.bgGreen(colors.white(colors.bold(' GateWay ')));
    console.log(brand, colors.green('Webhook recibido de Evolution:'), colors.blue(JSON.stringify(body)));
    return res.status(HttpStatus.OK).json({ status: 'success', message: 'Webhook recibido' });
  }
}
