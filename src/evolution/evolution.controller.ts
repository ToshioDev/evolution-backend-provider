import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  Res,
  HttpStatus,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
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
  ): Promise<{ status: string; message: string }> {

    const remoteJid = `${contact.phone}@whatsapp.net`;
    try {
      await this.evolutionService.sendMessageToEvolution(
        'text',
        remoteJid,
        message,
      );
      return { status: 'success', message: 'Mensaje enviado a Evolution API' };
    } catch (error) {
      return {
        status: 'error',
        message: 'Número inválido o error al contactar Evolution API',
      };
    }
  }

  handleIncomingMessage(@Body() body: any): string {
    const { remoteJid, instance, message } = body;
    console.log(
      `Received message from ${remoteJid} on instance ${instance}:`,
      message,
    );
    return 'Message received';
  }

  @Post('webhook')
  async evolutionWebhook(@Body() body: any, @Res() res) {
    const colors = require('colors');
    const brand =
      colors.bgBlue(colors.white(colors.bold(' WhatHub '))) +
      colors.bgGreen(colors.white(colors.bold(' GateWay ')));
    console.log(
      brand,
      colors.green('Webhook recibido de Evolution:'),
      colors.blue(JSON.stringify(body)),
    );
    return res
      .status(HttpStatus.OK)
      .json({ status: 'success', message: 'Webhook recibido' });
  }

  @Post('instance/create-basic')
  async createBasicInstance(
    @Body('number') number?: string,
  ): Promise<{ status: string; message: string; data?: any }> {

    try {
      const result = await this.evolutionService.createBasicInstance(number);
      return {
        status: 'success',
        message: 'Instancia básica creada exitosamente',
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al crear instancia básica: ${error}`,
      };
    }
  }

 
  @Delete('instance/:instanceName')
  async deleteInstance(
    @Param('instanceName') instanceName: string,
  ): Promise<{ status: string; message: string; data?: any }> {

    try {
      const result = await this.evolutionService.deleteInstance(instanceName);
      return {
        status: 'success',
        message: 'Instancia eliminada exitosamente',
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al eliminar instancia: ${error.message}`,
      };
    }
  }

  @Get('instances')
  async getAllInstances(): Promise<{ status: string; message: string; data?: any }> {

    try {
      const result = await this.evolutionService.getAllInstances();
      return {
        status: 'success',
        message: 'Lista de instancias obtenida exitosamente',
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al obtener lista de instancias: ${error.message}`,
      };
    }
  }
}
