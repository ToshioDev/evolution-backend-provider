// ...existing code...
import 'multer';
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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EvolutionService } from './evolution.service';
import { UserService } from '../user/user.service';
import { AuthGuard } from '../auth/auth.guard';
import { UserData } from '../../common/decorators/user.decorator';
import { LoggerService } from '../../common/services/logger.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  UpdateInstanceSettingsDto,
  ToggleAlwaysOnlineDto,
  ToggleRejectCallDto,
  ToggleGroupsIgnoreDto,
  ToggleReadMessagesDto,
  ToggleReadStatusDto,
  ToggleSyncFullHistoryDto,
  SetWebSocketConfigDto,
} from './dto/instance-settings.dto';

@ApiTags('evolution')
@Controller('evolution')
export class EvolutionController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file?: any,
    @Body('conversationId') conversationId?: string,
    @Body('locationId') locationId?: string,
    @Body('attachmentUrls') attachmentUrls?: string[],
  ): Promise<any> {
    if (!file) {
      return {
        status: 'error',
        message: 'No se recibió archivo',
      };
    }
    if (
      !conversationId ||
      !locationId ||
      !attachmentUrls ||
      !Array.isArray(attachmentUrls)
    ) {
      return {
        status: 'error',
        message:
          'Faltan campos requeridos: conversationId, locationId o attachmentUrls',
      };
    }
    const uploadResult = await this.evolutionService.uploadFileToGHL(file);
    return {
      ...uploadResult,
      conversationId,
      locationId,
      attachmentUrls,
    };
  }
  constructor(
    private readonly evolutionService: EvolutionService,
    private readonly userService: UserService,
    private readonly loggerService: LoggerService,
  ) {}

  @Get('qr')
  @ApiOperation({ summary: 'Obtener QR de la instancia' })
  async getInstanceQr(
    @Query('instanceName') instanceName: string,
    @Query('number') number: string,
  ): Promise<any> {
    try {
      this.loggerService.log(
        'Solicitud de QR recibida',
        'EvolutionController',
        { instanceName, number },
      );

      const qr = await this.evolutionService.getInstanceQr(
        instanceName,
        number,
      );

      this.loggerService.success(
        'QR obtenido exitosamente',
        'EvolutionController',
        { instanceName, number },
      );

      return {
        status: 'success',
        message: 'QR obtenido exitosamente',
        data: qr,
      };
    } catch (error) {
      this.loggerService.error('Error al obtener QR', 'EvolutionController', {
        instanceName,
        number,
        error: error.message,
      });
      return {
        status: 'error',
        message: `Error al obtener QR: ${error.message}`,
      };
    }
  }

  @Post('message')
  async sendMessage(
    @Body('conversationId') conversationId: string,
    @Body('message') message: string,
    @Body('contact') contact: { id: string; phone: string },
    @Body('locationId') locationId: string,
    @UserData() userData: any,
    @Body('fileUrl') fileUrl?: string,
    @Body('fileType') fileType?: string,
    @Body('fileMessage') fileMessage?: string,
  ): Promise<{ status: string; message: string; url?: string; type?: string; attachments?: { url: string; type: string }[] }> {
    if (!contact || !contact.phone) {
      throw new BadRequestException(
        'El contacto y su teléfono son obligatorios',
      );
    }
    const numberTarget = contact.phone.replace('+', '');
    try {
      if (fileUrl && fileType && fileMessage) {
        // Si es archivo, determina el tipo para EvolutionService
        let typeForService: 'audio' | 'image' = 'image';
        if (fileType === 'audio') typeForService = 'audio';
        else if (fileType === 'image' || fileType === 'video')
          typeForService = 'image';
        // Aquí podrías guardar en Mongo o reenviar a GHL, según tu lógica
        await this.evolutionService.sendMessageToEvolution(
          typeForService,
          numberTarget,
          fileUrl,
          userData.id,
        );
        return {
          status: 'success',
          message: fileMessage,
          attachments: [
            {
              url: fileUrl,
              type: fileType,
            },
          ],
        };
      } else if (message && typeof message === 'string') {
        this.loggerService.log(
          'Enviando mensaje via Evolution API',
          'EvolutionController',
          {
            conversationId,
            numberTarget,
            userId: userData.id,
            locationId: userData.locationId,
          },
        );
        await this.evolutionService.sendMessageToEvolution(
          'text',
          numberTarget,
          message,
          userData.id,
        );
        this.loggerService.success(
          'Mensaje enviado exitosamente via Evolution API',
          'EvolutionController',
          { conversationId, numberTarget, userId: userData.id },
        );
        return {
          status: 'success',
          message: 'Mensaje enviado a Evolution API',
        };
      } else {
        return {
          status: 'error',
          message: 'Debe enviar un mensaje de texto o un archivo válido',
        };
      }
    } catch (error) {
      this.loggerService.error(
        'Error al enviar mensaje o archivo via Evolution API',
        'EvolutionController',
        {
          conversationId,
          numberTarget,
          userId: userData.id,
          error: error.message,
        },
      );
      return {
        status: 'error',
        message: 'Error al procesar mensaje o archivo',
      };
    }
  }

  handleIncomingMessage(@Body() body: any): string {
    const { remoteJid, instance, message } = body;

    this.loggerService.log('Mensaje entrante recibido', 'EvolutionController', {
      remoteJid,
      instance,
      messageType: typeof message,
    });

    return 'Message received';
  }

  @Post('webhook')
  async evolutionWebhook(@Body() body: any, @Res() res) {
    this.loggerService.log(
      'Webhook recibido de Evolution',
      'EvolutionController',
      {
        event: body.event,
        instance: body.instance,
        dataKeys: Object.keys(body).join(', '),
      },
    );

    return res
      .status(HttpStatus.OK)
      .json({ status: 'success', message: 'Webhook recibido' });
  }

  @Post('instance/create-basic')
  @ApiOperation({ summary: 'Crear instancia básica' })
  async createBasicInstance(
    @Body('userId') userId: string,
    @Body('number') number?: string,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      this.loggerService.log(
        'Creando instancia básica Evolution',
        'EvolutionController',
        { userId, number },
      );

      const result = await this.evolutionService.createBasicInstance(
        userId,
        number,
      );

      this.loggerService.success(
        'Instancia básica creada exitosamente',
        'EvolutionController',
        { userId, number, instanceName: result?.instanceName },
      );

      return {
        status: 'success',
        message: 'Instancia básica creada exitosamente',
        data: result,
      };
    } catch (error) {
      this.loggerService.error(
        'Error al crear instancia básica',
        'EvolutionController',
        { userId, number, error: error.message },
      );
      return {
        status: 'error',
        message: `Error al crear instancia básica: ${error}`,
      };
    }
  }

  @Delete('instance/:instanceName')
  @ApiOperation({ summary: 'Eliminar instancia' })
  async deleteInstance(
    @Param('instanceName') instanceName: string,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      this.loggerService.log(
        'Eliminando instancia Evolution',
        'EvolutionController',
        { instanceName },
      );

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

        this.loggerService.success(
          'Instancia eliminada y usuario actualizado',
          'EvolutionController',
          { instanceName, userId: user.id },
        );
      } else {
        this.loggerService.success(
          'Instancia eliminada (usuario no encontrado)',
          'EvolutionController',
          { instanceName },
        );
      }

      return {
        status: 'success',
        message: 'Instancia eliminada exitosamente',
        data: result,
      };
    } catch (error) {
      this.loggerService.error(
        'Error al eliminar instancia Evolution',
        'EvolutionController',
        { instanceName, error: error.message },
      );
      return {
        status: 'error',
        message: `Error al eliminar instancia: ${error.message}`,
      };
    }
  }

  @Get('instances')
  @ApiOperation({ summary: 'Obtener todas las instancias' })
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
  @ApiOperation({ summary: 'Obtener información de una instancia' })
  @ApiParam({
    name: 'instanceName',
    required: true,
    description: 'Nombre de la instancia',
  })
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
  @ApiOperation({ summary: 'Reiniciar instancia' })
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
  @ApiOperation({ summary: 'Obtener estado de conexión de la instancia' })
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
  @ApiOperation({ summary: 'Validar y reiniciar instancia' })
  async validateAndRestartInstance(
    @Param('instanceName') instanceName: string,
  ) {
    return this.evolutionService.validateAndRestartInstance(instanceName);
  }

  @Put('instance/:instanceName/settings')
  @ApiOperation({ summary: 'Actualizar configuraciones de instancia' })
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
  @ApiOperation({ summary: 'Activar o desactivar Always Online' })
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
  @ApiOperation({ summary: 'Activar o desactivar rechazo de llamadas' })
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
  @ApiOperation({ summary: 'Activar o desactivar ignorar grupos' })
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
  @ApiOperation({ summary: 'Activar o desactivar lectura de mensajes' })
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
  @ApiOperation({ summary: 'Activar o desactivar estado de lectura' })
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
  @ApiOperation({
    summary: 'Activar o desactivar sincronización completa del historial',
  })
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

  @Post('instance/:instanceName/websocket')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Configurar WebSocket para instancia',
    description:
      'Configura los ajustes de WebSocket para una instancia específica de Evolution API',
  })
  @ApiParam({
    name: 'instanceName',
    description: 'Nombre de la instancia a configurar',
  })
  @ApiBody({
    type: SetWebSocketConfigDto,
    description: 'Configuración del WebSocket',
  })
  @ApiBearerAuth()
  async setWebSocketConfig(
    @Param('instanceName') instanceName: string,
    @Body() websocketConfigDto: SetWebSocketConfigDto,
    @UserData() user: any,
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      this.loggerService.log(
        'Configurando WebSocket para instancia',
        'EvolutionController',
        {
          instanceName,
          websocketConfig: websocketConfigDto,
          userId: user.id,
        },
      );

      const result = await this.evolutionService.setWebSocketConfig(
        instanceName,
        websocketConfigDto,
      );

      this.loggerService.success(
        `WebSocket configurado exitosamente para instancia: ${instanceName}`,
        'EvolutionController',
        { instanceName, result },
      );

      return {
        status: 'success',
        message: `Configuración de WebSocket actualizada para la instancia ${instanceName}`,
        data: result,
      };
    } catch (error) {
      this.loggerService.error(
        `Error al configurar WebSocket para instancia: ${instanceName}`,
        'EvolutionController',
        {
          error: error.message,
          errorData: error?.response?.data,
          instanceName,
          websocketConfig: websocketConfigDto,
        },
      );

      return {
        status: 'error',
        message: `Error al configurar WebSocket: ${error.message}`,
        data: { errorData: error?.response?.data },
      };
    }
  }
}
