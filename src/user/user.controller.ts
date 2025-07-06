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
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.schema';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<User>) {
    return this.userService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.userService.delete(id);
    return { status: 'success', message: 'User deleted' };
  }

  @Get('location/:locationId')
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
}
