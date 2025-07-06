import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { username, email, password, locationId } = registerDto;

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new HttpException('El usuario ya existe', HttpStatus.CONFLICT);
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userData = {
      username,
      email,
      password: hashedPassword,
      locationId: locationId || 'JVNpuC2h3NmmWohtPTQ5', 
    };

    const user = await this.userService.create(userData);
    const userDoc = user as any;

    const token = await this.userService.generateUserToken(
      userDoc._id.toString(),
    );

    return {
      token,
      user: {
        id: userDoc._id,
        username: user.username,
        email: user.email,
        locationId: user.locationId,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new HttpException(
        'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new HttpException(
        'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userDoc = user as any;

    const token = await this.userService.generateUserToken(
      userDoc._id.toString(),
    );

    return {
      token,
      user: {
        id: userDoc._id,
        username: user.username,
        email: user.email,
        locationId: user.locationId,
      },
    };
  }

  async validateToken(token: string) {
    const user = await this.userService.findByToken(token);
    if (!user) {
      throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
    }
    return user;
  }
}
