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
      const evolutionInstances = await this.evolutionService.getAllInstances();

      if (evolutionInstances && evolutionInstances.length > 0) {
        const userInstanceIdentifiers: string[] = [];
        if (user.evolutionInstances) {
          user.evolutionInstances.forEach((inst) => {
            if (inst.id) userInstanceIdentifiers.push(inst.id);
            if (inst.name) userInstanceIdentifiers.push(inst.name);
            if (inst.evolutionId)
              userInstanceIdentifiers.push(inst.evolutionId);
          });
        }

        const userEvolutionInstances = evolutionInstances
          .filter((instance) => {
            const instanceName = instance.name;
            return userInstanceIdentifiers.includes(instanceName);
          })
          .map((instance) => ({
            id: instance.name,
            name: instance.name,
            connectionStatus: instance.connectionStatus || 'disconnected',
            ownerJid: instance.ownerJid || '',
            token: instance.token || '',
            evolutionId: instance.name,
            profileName: instance.profileName || null,
            state: instance.connectionStatus || 'unknown',
            profilePicUrl: instance.profilePicUrl || null,
          }));

        if (userEvolutionInstances.length > 0) {
          let needsUpdate = false;

          userEvolutionInstances.forEach((newInstance) => {
            const existingInstance = user.evolutionInstances?.find(
              (existing) =>
                existing.id === newInstance.id ||
                existing.name === newInstance.name ||
                existing.evolutionId === newInstance.evolutionId,
            );

            if (!existingInstance) {
              needsUpdate = true;
              return;
            }

            if (
              !existingInstance.connectionStatus ||
              !existingInstance.ownerJid ||
              !existingInstance.token ||
              !existingInstance.profileName ||
              !existingInstance.profilePicUrl ||
              existingInstance.connectionStatus !==
                newInstance.connectionStatus ||
              existingInstance.ownerJid !== newInstance.ownerJid ||
              existingInstance.token !== newInstance.token ||
              existingInstance.profileName !== newInstance.profileName ||
              existingInstance.profilePicUrl !== newInstance.profilePicUrl ||
              existingInstance.number !== newInstance.number
            ) {
              needsUpdate = true;
            }
          });

          if (needsUpdate) {
            const updateResult =
              await this.userService.updateExistingEvolutionInstances(
                user._id,
                userEvolutionInstances,
              );

            if (updateResult) {
              const updatedUser = await this.userService.findById(user._id);

              return {
                status: 'success',
                data: updatedUser.evolutionInstances || [],
                message: `${userEvolutionInstances.length} instances synchronized successfully`,
                lastSync: new Date().toISOString(),
                updated: true,
              };
            }
          }

          // Si no hay cambios, devolver los datos existentes
          return {
            status: 'success',
            data: user.evolutionInstances || [],
            message: 'No updates needed - data is already current',
            lastSync: new Date().toISOString(),
            updated: false,
          };
        }
      }

      return {
        status: 'success',
        data: user.evolutionInstances || [],
        message: 'No instances found in Evolution API or no updates needed',
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
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
