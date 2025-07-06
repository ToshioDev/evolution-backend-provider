import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, GhlAuth } from './user.schema';

import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
}
