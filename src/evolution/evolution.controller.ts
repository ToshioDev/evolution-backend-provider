import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Put,
} from '@nestjs/common';
import { EvolutionService } from './evolution.service';
import { UserService } from '../user/user.service';
import { AuthGuard } from '../auth/auth.guard';
import { UserData } from '../auth/decorators/user.decorator';
import {
  CreateBasicInstanceDto,
  UpdateInstanceSettingsDto,
  ToggleAlwaysOnlineDto,
  ToggleRejectCallDto,
  ToggleGroupsIgnoreDto,
  ToggleReadMessagesDto,
  ToggleReadStatusDto,
  ToggleSyncFullHistoryDto,
} from './dto/instance-settings.dto';

@Controller('evolution')
export class EvolutionController {
  constructor(
    private readonly evolutionService: EvolutionService,
    private readonly userService: UserService,
  ) {}

  @Get('qr')
  async getInstanceQr(
    @Query('instanceName') instanceName: string,
    @Query('number') number: string,
  ): Promise<any> {
    try {
      const qr = await this.evolutionService.getInstanceQr(
        instanceName,
        number,
      );
      return {
        status: 'success',
        message: 'QR obtenido exitosamente',
        data: qr,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al obtener QR: ${error.message}`,
      };
    }
  }

  @Post('message')
  @UseGuards(AuthGuard)
  async sendMessage(
    @Body('conversationId') conversationId: string,
    @Body('message') message: string,
    @Body('contact') contact: { id: string; phone: string },
    @Body('locationId') locationId: string,
    @UserData() userData: any,
  ): Promise<{ status: string; message: string }> {
    const numberTarget = contact.phone.replace('+', '');
    try {
      await this.evolutionService.sendMessageToEvolution(
        'text',
        numberTarget,
        message,
        userData.id,
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
    @Body('userId') userId: string,
    @Body('number') number?: string,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const result = await this.evolutionService.createBasicInstance(
        userId,
        number,
      );
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
      const user =
        await this.userService.findOneByEvolutionInstanceName(instanceName);
      if (user) {
        user.evolutionInstances = (user.evolutionInstances || []).filter(
          (inst: any) => inst.name !== instanceName,
        );
        await this.userService.update(user.id, {
          evolutionInstances: user.evolutionInstances,
        });
      }

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
  async getAllInstances(): Promise<{
    status: string;
    message: string;
    data?: any;
  }> {
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

  @Get('instance/:instanceName')
  async getInstanceInfo(
    @Param('instanceName') instanceName: string,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const instanceInfo =
        await this.evolutionService.getInstanceByName(instanceName);
      if (!instanceInfo) {
        return {
          status: 'error',
          message: 'Instancia no encontrada',
        };
      }
      return {
        status: 'success',
        message: 'Información de la instancia obtenida exitosamente',
        data: instanceInfo,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al obtener información de la instancia: ${error.message}`,
      };
    }
  }
  @Post('instance/restart/:instanceName')
  async restartInstance(
    @Param('instanceName') instanceName: string,
  ): Promise<any> {
    try {
      const result = await this.evolutionService.restartInstance(instanceName);
      return {
        status: 'success',
        message: 'Instancia reiniciada exitosamente',
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al reiniciar instancia: ${error}`,
      };
    }
  }
  @Get('getStatus/:instanceName')
  async getInstanceConnectionStatus(
    @Param('instanceName') instanceName: string,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const connectionState =
        await this.evolutionService.getInstanceConnectionState(instanceName);
      return {
        status: 'success',
        message: 'Estado de conexión obtenido exitosamente',
        data: connectionState,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al obtener estado de conexión: ${error.message}`,
      };
    }
  }
  @Post('validate-profile/:instanceName')
  async validateAndRestartInstance(
    @Param('instanceName') instanceName: string,
  ) {
    return this.evolutionService.validateAndRestartInstance(instanceName);
  }

  @Put('instance/:instanceName/settings')
  async updateInstanceSettings(
    @Param('instanceName') instanceName: string,
    @Body() updateSettingsDto: UpdateInstanceSettingsDto,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const result = await this.evolutionService.updateInstanceSettings(
        instanceName,
        updateSettingsDto,
      );
      return {
        status: 'success',
        message: 'Configuraciones de instancia actualizadas exitosamente',
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al actualizar configuraciones: ${error.message}`,
      };
    }
  }

  @Put('instance/:instanceName/always-online')
  async toggleAlwaysOnline(
    @Param('instanceName') instanceName: string,
    @Body() toggleDto: ToggleAlwaysOnlineDto,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const result = await this.evolutionService.toggleAlwaysOnline(
        instanceName,
        toggleDto.enabled,
      );
      return {
        status: 'success',
        message: `Always Online ${toggleDto.enabled ? 'activado' : 'desactivado'} exitosamente`,
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al cambiar Always Online: ${error.message}`,
      };
    }
  }

  @Put('instance/:instanceName/reject-call')
  async toggleRejectCall(
    @Param('instanceName') instanceName: string,
    @Body() toggleDto: ToggleRejectCallDto,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const result = await this.evolutionService.toggleRejectCall(
        instanceName,
        toggleDto.enabled,
        toggleDto.msgCall,
      );
      return {
        status: 'success',
        message: `Rechazar llamadas ${toggleDto.enabled ? 'activado' : 'desactivado'} exitosamente`,
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al cambiar rechazo de llamadas: ${error.message}`,
      };
    }
  }

  @Put('instance/:instanceName/groups-ignore')
  async toggleGroupsIgnore(
    @Param('instanceName') instanceName: string,
    @Body() toggleDto: ToggleGroupsIgnoreDto,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const result = await this.evolutionService.toggleGroupsIgnore(
        instanceName,
        toggleDto.enabled,
      );
      return {
        status: 'success',
        message: `Ignorar grupos ${toggleDto.enabled ? 'activado' : 'desactivado'} exitosamente`,
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al cambiar ignorar grupos: ${error.message}`,
      };
    }
  }

  @Put('instance/:instanceName/read-messages')
  async toggleReadMessages(
    @Param('instanceName') instanceName: string,
    @Body() toggleDto: ToggleReadMessagesDto,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const result = await this.evolutionService.toggleReadMessages(
        instanceName,
        toggleDto.enabled,
      );
      return {
        status: 'success',
        message: `Leer mensajes ${toggleDto.enabled ? 'activado' : 'desactivado'} exitosamente`,
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al cambiar leer mensajes: ${error.message}`,
      };
    }
  }

  @Put('instance/:instanceName/read-status')
  async toggleReadStatus(
    @Param('instanceName') instanceName: string,
    @Body() toggleDto: ToggleReadStatusDto,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const result = await this.evolutionService.toggleReadStatus(
        instanceName,
        toggleDto.enabled,
      );
      return {
        status: 'success',
        message: `Estado de lectura ${toggleDto.enabled ? 'activado' : 'desactivado'} exitosamente`,
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al cambiar estado de lectura: ${error.message}`,
      };
    }
  }

  @Put('instance/:instanceName/sync-full-history')
  async toggleSyncFullHistory(
    @Param('instanceName') instanceName: string,
    @Body() toggleDto: ToggleSyncFullHistoryDto,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const result = await this.evolutionService.toggleSyncFullHistory(
        instanceName,
        toggleDto.enabled,
      );
      return {
        status: 'success',
        message: `Sincronización completa del historial ${toggleDto.enabled ? 'activada' : 'desactivada'} exitosamente`,
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error al cambiar sincronización del historial: ${error.message}`,
      };
    }
  }
}
2;
