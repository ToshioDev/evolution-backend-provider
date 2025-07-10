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
        const userInstanceNames =
          user.evolutionInstances?.map((inst) => inst.id || inst.name) || [];

        const userEvolutionInstances = evolutionInstances
          .filter((instance) =>
            userInstanceNames.includes(instance.instanceName),
          )
          .map((instance) => ({
            id: instance.instanceName,
            name: instance.instanceName,
            connectionStatus: instance.connectionStatus || 'disconnected',
            ownerJid: instance.ownerJid || '',
            token: instance.token || '',
            evolutionId: instance.instanceName,
            profileName: instance.profileName || null,
            state: instance.state,
          }));

        if (userEvolutionInstances.length > 0) {
          await this.evolutionService.updateEvolutionInstancesForUser(
            user._id,
            userEvolutionInstances,
          );

          return {
            status: 'success',
            data: userEvolutionInstances,
            message: 'Instances synchronized successfully',
          };
        }
      }

      return {
        status: 'success',
        data: user.evolutionInstances || [],
        message: 'No instances found in Evolution API',
      };
    } catch (error) {
      console.error('Error synchronizing evolution instances:', error.message);
      return {
        status: 'success',
        data: user.evolutionInstances || [],
        message: 'Returned cached instances due to sync error',
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
