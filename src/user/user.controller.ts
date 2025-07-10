import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.schema';
import { AuthGuard } from '../auth/auth.guard';
import {
  CurrentUser,
  LocationId,
  UserData,
} from '../auth/decorators/user.decorator';
import { EvolutionService } from 'src/evolution/evolution.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly evolutionService: EvolutionService,
  ) {}

  @Post()
  async create(@Body() data: Partial<User>) {
    try {
      const user = await this.userService.create(data);
      return { status: 'success', user };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll() {
    return this.userService.findAll();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      status: 'success',
      message: 'Datos del usuario autenticado',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        locationId: user.locationId,
        ghlAuth: user.ghlAuth,
        evolutionInstances: user.evolutionInstances,
      },
    };
  }

  @Get('me/instances')
  @UseGuards(AuthGuard)
  async getUserEvolutionInstances(@CurrentUser() user: any) {
    try {
      const brand =
        '\x1b[44m\x1b[37m WhatHub \x1b[0m\x1b[42m\x1b[37m GateWay \x1b[0m';
      console.log(
        brand,
        '\x1b[34mActualizando instancias para usuario:\x1b[0m',
        user._id,
      );

      // Obtener todas las instancias de Evolution API
      const evolutionInstances = await this.evolutionService.getAllInstances();

      if (evolutionInstances && evolutionInstances.length > 0) {
        // Obtener nombres/ids de instancias del usuario actual
        const userInstanceIdentifiers: string[] = [];
        if (user.evolutionInstances) {
          user.evolutionInstances.forEach((inst) => {
            if (inst.id) userInstanceIdentifiers.push(inst.id);
            if (inst.name) userInstanceIdentifiers.push(inst.name);
            if (inst.evolutionId)
              userInstanceIdentifiers.push(inst.evolutionId);
          });
        }

        console.log(
          brand,
          '\x1b[34mIdentificadores del usuario:\x1b[0m',
          userInstanceIdentifiers,
        );

        // Filtrar instancias que pertenecen al usuario
        const userEvolutionInstances = evolutionInstances
          .filter((instance) => {
            // Usar 'name' en lugar de 'instanceName'
            const instanceName = instance.name;
            const found = userInstanceIdentifiers.includes(instanceName);

            console.log(
              brand,
              `\x1b[34mVerificando instancia:\x1b[0m ${instanceName} - \x1b[${found ? '32' : '31'}m${found ? 'ENCONTRADA' : 'NO ENCONTRADA'}\x1b[0m`,
            );

            return found;
          })
          .map((instance) => ({
            id: instance.name, // Usar 'name' como id
            name: instance.name,
            connectionStatus: instance.connectionStatus || 'disconnected',
            ownerJid: instance.ownerJid || '',
            token: instance.token || '',
            evolutionId: instance.name, // Usar 'name' como evolutionId
            profileName: instance.profileName || null,
            state: instance.connectionStatus || 'unknown', // Usar connectionStatus como state
            // Agregar campos adicionales si los necesitas
            profilePicUrl: instance.profilePicUrl || '',
            number: instance.number || '',
            businessId: instance.businessId || null,
          }));

        console.log(
          brand,
          '\x1b[34mInstancias filtradas para actualizar:\x1b[0m',
          userEvolutionInstances.length,
        );

        // Si hay instancias para actualizar
        if (userEvolutionInstances.length > 0) {
          const updateResult =
            await this.evolutionService.updateExistingEvolutionInstancesForUser(
              user._id,
              userEvolutionInstances,
            );

          if (updateResult) {
            console.log(
              brand,
              '\x1b[32mInstancias actualizadas exitosamente:\x1b[0m',
              userEvolutionInstances.length,
            );

            // Obtener el usuario actualizado para devolver los datos más recientes
            const updatedUser = await this.userService.findById(user._id);

            return {
              status: 'success',
              data: updatedUser.evolutionInstances || [],
              message: `${userEvolutionInstances.length} instances synchronized successfully`,
              lastSync: new Date().toISOString(),
            };
          }
        }
      }

      // Si no hay instancias nuevas o no se pudieron actualizar, devolver las existentes
      console.log(
        brand,
        '\x1b[33mNo se encontraron instancias para actualizar, devolviendo cached:\x1b[0m',
      );

      return {
        status: 'success',
        data: user.evolutionInstances || [],
        message: 'No instances found in Evolution API or no updates needed',
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error synchronizing evolution instances:', error.message);

      return {
        status: 'error',
        data: user.evolutionInstances || [],
        message: 'Error during synchronization, returned cached instances',
        error: error.message,
        lastSync: new Date().toISOString(),
      };
    }
  }

  @Get('me/location')
  @UseGuards(AuthGuard)
  async getCurrentUserLocation(@LocationId() locationId: string) {
    return {
      status: 'success',
      message: 'LocationId del usuario autenticado',
      data: {
        locationId,
      },
    };
  }

  @Post('me/token/revoke')
  @UseGuards(AuthGuard)
  async revokeToken(@CurrentUser() user: any) {
    try {
      await this.userService.revokeUserToken(user._id);
      return {
        status: 'success',
        message: 'Token revocado exitosamente',
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(
    @UserData() userData: any,
    @LocationId() locationId: string,
  ) {
    return {
      status: 'success',
      message: 'Perfil obtenido con token de usuario',
      data: {
        userData,
        locationId,
        message: 'Este endpoint requiere token de usuario personalizado',
      },
    };
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Body() data: Partial<User>,
    @CurrentUser() user: any,
    @LocationId() locationId: string,
  ) {
    return {
      status: 'success',
      message: 'Perfil actualizado con token de usuario',
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        locationId,
        message: 'Este endpoint requiere token de usuario personalizado',
        receivedData: data,
      },
    };
  }

  @Get('location/:locationId')
  @UseGuards(AuthGuard)
  async findByLocationId(@Param('locationId') locationId: string) {
    try {
      const user = await this.userService.findByLocationId(locationId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return { status: 'success', user };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Rutas con parámetros AL FINAL
  @Get(':id')
  @UseGuards(AuthGuard)
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() data: Partial<User>) {
    return this.userService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async delete(@Param('id') id: string) {
    await this.userService.delete(id);
    return { status: 'success', message: 'User deleted' };
  }
}
