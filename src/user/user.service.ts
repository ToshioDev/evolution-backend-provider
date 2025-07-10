import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, GhlAuth } from './user.schema';

import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async updateUserEvolutionInstances(userId: string, instanceData: any): Promise<boolean> {
    // Asegura que evolutionId siempre esté presente y sea igual al id de la instancia
    instanceData.evolutionId = instanceData.id;
    const result = await this.userModel.findByIdAndUpdate(
      userId,
      { $push: { evolutionInstances: instanceData } },
      { new: true }
    );

    return !!result;
  }

  /**
   * Reemplaza el array completo de evolutionInstances del usuario.
   * @param userId string
   * @param instances Array<{ id, name, connectionStatus, ownerJid, token }>
   * @returns Promise<boolean>
   */
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
    }>
  ): Promise<boolean> {
    const result = await this.userModel.findByIdAndUpdate(
      userId,
      { evolutionInstances: instances },
      { new: true }
    );
    return !!result;
  }

  async onModuleInit() {
    await this.userModel.createCollection();
    await this.userModel.syncIndexes();
  }

  async create(data: Partial<User>): Promise<User> {
    const created = new this.userModel(data);
    return created.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
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
    const user = await this.userModel
      .findOneAndUpdate({ locationId }, { ghlAuth }, { new: true })
      .exec();
    if (!user)
      throw new NotFoundException(
        `User with locationId ${locationId} not found`,
      );
    return user;
  }

  async findByLocationId(locationId: string): Promise<User | null> {
    return this.userModel.findOne({ locationId }).exec();
  }

  async findByGhlAccessToken(accessToken: string): Promise<User | null> {
    return this.userModel
      .findOne({ 'ghlAuth.access_token': accessToken })
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

  async findOneByEvolutionInstanceName(instanceName: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ 'evolutionInstances.name': instanceName }).exec();
  }
}
