import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, GhlAuth } from './user.schema';
import { LoggerService, ConfigurationService } from '../../common';

import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigurationService,
  ) {
    // Validar configuración del módulo User al inicializar
    this.configService.logModuleConfig('user');
  }

  async updateExistingEvolutionInstances(
    userId: string,
    updatedInstances: Array<{
      id: string;
      name: string;
      connectionStatus: string;
      ownerJid: string;
      token: string;
      evolutionId: string;
      profileName: string;
      profilePicUrl: string | null;
      state?: string;
      isPrimary: boolean;
    }>,
  ): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.loggerService.warn(
          `Usuario no encontrado para actualizar instancias Evolution`,
          'UserService',
          { userId },
        );
        return false;
      }

      const existingInstances = user.evolutionInstances || [];

      const updatedInstancesMap = new Map();
      updatedInstances.forEach((instance) => {
        updatedInstancesMap.set(instance.id, instance);
        updatedInstancesMap.set(instance.name, instance);
        updatedInstancesMap.set(instance.evolutionId, instance);
      });

      const mergedInstances = existingInstances.map((existingInstance) => {
        const plainExistingInstance = JSON.parse(
          JSON.stringify(existingInstance),
        );

        const instanceKey =
          plainExistingInstance.id ||
          plainExistingInstance.name ||
          plainExistingInstance.evolutionId;

        if (updatedInstancesMap.has(instanceKey)) {
          const updatedInstance = updatedInstancesMap.get(instanceKey);

          const merged = {
            ...plainExistingInstance,
            ...updatedInstance,
          };

          return merged;
        }

        return plainExistingInstance;
      });

      const result = await this.userModel.findByIdAndUpdate(
        userId,
        { evolutionInstances: mergedInstances },
        { new: true },
      );

      const success = !!result;
      if (success) {
        this.loggerService.success(
          `${updatedInstances.length} instancias Evolution actualizadas exitosamente`,
          'UserService',
          { userId, instanceCount: updatedInstances.length },
        );
      }
      return success;
    } catch (error) {
      this.loggerService.error(
        'Error al actualizar instancias Evolution existentes',
        'UserService',
        { userId, error: error.message },
      );
      return false;
    }
  }

  async updateUserEvolutionInstances(
    userId: string,
    instanceData: any,
  ): Promise<boolean> {
    try {
      instanceData.evolutionId = instanceData.id;
      const result = await this.userModel.findByIdAndUpdate(
        userId,
        { $push: { evolutionInstances: instanceData } },
        { new: true },
      );

      const success = !!result;
      if (success) {
        this.loggerService.success(
          `Instancia Evolution agregada exitosamente`,
          'UserService',
          {
            userId,
            instanceName: instanceData.name,
            instanceId: instanceData.id,
          },
        );
      } else {
        this.loggerService.warn(
          `No se pudo agregar instancia Evolution - Usuario no encontrado`,
          'UserService',
          { userId },
        );
      }
      return success;
    } catch (error) {
      this.loggerService.error(
        'Error al agregar instancia Evolution',
        'UserService',
        { userId, instanceData, error: error.message },
      );
      return false;
    }
  }

  async setUserEvolutionInstances(
    userId: string,
    instances: Array<{
      id: string;
      name: string;
      connectionStatus: string;
      ownerJid: string;
      token: string;
      evolutionId: string;
      profileName: string;
      profilePicUrl: string | null;
      isPrimary: boolean;
    }>,
  ): Promise<boolean> {
    const result = await this.userModel.findByIdAndUpdate(
      userId,
      { evolutionInstances: instances },
      { new: true },
    );
    return !!result;
  }

  async onModuleInit() {
    await this.userModel.createCollection();
    await this.userModel.syncIndexes();
    this.loggerService.success(
      'UserService inicializado correctamente',
      'UserService',
    );
  }

  async create(data: Partial<User>): Promise<User> {
    try {
      const created = new this.userModel(data);
      const result = await created.save();
      this.loggerService.success(`Usuario creado exitosamente`, 'UserService', {
        userId: result._id,
        email: result.email,
      });
      return result;
    } catch (error) {
      this.loggerService.error('Error al crear usuario', 'UserService', {
        data,
        error: error.message,
      });
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async getAllUsersWithTokens(): Promise<User[]> {
    try {
      const users = await this.userModel
        .find({
          'ghlAuth.access_token': { $exists: true, $ne: null },
          'ghlAuth.expires_at': { $exists: true, $ne: null },
        })
        .exec();

      this.loggerService.debug(
        `Encontrados ${users.length} usuarios con tokens activos`,
        'UserService',
      );
      return users;
    } catch (error) {
      this.loggerService.error(
        'Error al obtener usuarios con tokens',
        'UserService',
        { error: error.message },
      );
      throw error;
    }
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('User not found');
  }

  async updateGhlAuthByLocationId(
    locationId: string,
    ghlAuth: GhlAuth,
  ): Promise<User> {
    try {
      const user = await this.userModel
        .findOneAndUpdate({ locationId }, { ghlAuth }, { new: true })
        .exec();

      if (!user) {
        this.loggerService.warn(
          `Usuario no encontrado con locationId: ${locationId}`,
          'UserService',
        );
        throw new NotFoundException(
          `User with locationId ${locationId} not found`,
        );
      }

      this.loggerService.success(
        `GHL Auth actualizado exitosamente`,
        'UserService',
        { locationId, userId: user._id },
      );
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggerService.error('Error al actualizar GHL Auth', 'UserService', {
        locationId,
        error: error.message,
      });
      throw error;
    }
  }

  async findByLocationId(locationId: string): Promise<User | null> {
    return this.userModel.findOne({ locationId }).exec();
  }

  async findByGhlAccessToken(accessToken: string): Promise<User | null> {
    return this.userModel
      .findOne({ 'ghlAuth.access_token': accessToken })
      .exec();
  }

  async getAllUsersWithGhlAuth(): Promise<User[]> {
    return this.userModel
      .find({
        ghlAuth: { $exists: true, $ne: null },
        'ghlAuth.access_token': { $exists: true },
        'ghlAuth.refresh_token': { $exists: true },
      })
      .exec();
  }

  async findByUserToken(userToken: string): Promise<User | null> {
    return this.userModel.findOne({ userToken }).exec();
  }

  async findByToken(token: string): Promise<User | null> {
    return this.userModel.findOne({ userToken: token }).exec();
  }

  async generateUserToken(userId: string): Promise<string> {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    const userToken = `usr_${timestamp}_${randomPart}`;
    await this.userModel.findByIdAndUpdate(userId, { userToken }).exec();

    return userToken;
  }

  async revokeUserToken(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { $unset: { userToken: 1 } })
      .exec();
  }

  async findOneByEvolutionInstanceName(
    instanceName: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ 'evolutionInstances.name': instanceName })
      .exec();
  }

  async toggleInstancePrimary(
    userId: string,
    instanceId: string,
  ): Promise<{ success: boolean; isPrimary?: boolean }> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.loggerService.warn(
          `Usuario no encontrado para toggle instance primary`,
          'UserService',
          { userId, instanceId },
        );
        return { success: false };
      }

      const evolutionInstances = user.evolutionInstances || [];

      const instanceIndex = evolutionInstances.findIndex(
        (instance) =>
          instance.id === instanceId ||
          instance.name === instanceId ||
          instance.evolutionId === instanceId,
      );

      if (instanceIndex === -1) {
        this.loggerService.warn(
          `Instancia Evolution no encontrada para toggle primary`,
          'UserService',
          { userId, instanceId },
        );
        return { success: false };
      }

      const currentState = evolutionInstances[instanceIndex].isPrimary || false;
      const newState = !currentState;

      if (newState) {
        evolutionInstances.forEach((instance, index) => {
          if (index !== instanceIndex) {
            instance.isPrimary = false;
          }
        });
      }

      evolutionInstances[instanceIndex].isPrimary = newState;

      const result = await this.userModel.findByIdAndUpdate(
        userId,
        { evolutionInstances },
        { new: true },
      );

      const success = !!result;
      if (success) {
        this.loggerService.success(
          `Estado primary de instancia Evolution cambiado a: ${newState}`,
          'UserService',
          {
            userId,
            instanceId,
            instanceName: evolutionInstances[instanceIndex].name,
            isPrimary: newState,
          },
        );
      }

      return {
        success,
        isPrimary: newState,
      };
    } catch (error) {
      this.loggerService.error(
        'Error al cambiar estado primary de instancia Evolution',
        'UserService',
        { userId, instanceId, error: error.message },
      );
      return { success: false };
    }
  }
}
