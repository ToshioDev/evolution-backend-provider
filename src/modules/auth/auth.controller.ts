import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { LoggerService } from '../../common/services/logger.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loggerService: LoggerService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    try {
      this.loggerService.log(
        'Solicitud de registro recibida',
        'AuthController',
        { email: registerDto.email },
      );

      const result = await this.authService.register(registerDto);

      this.loggerService.success(
        'Registro completado exitosamente via API',
        'AuthController',
        { email: registerDto.email },
      );

      return {
        status: 'success',
        message: 'Usuario registrado exitosamente',
        data: result,
      };
    } catch (error) {
      this.loggerService.error('Error en registro via API', 'AuthController', {
        email: registerDto.email,
        error: error.message,
      });
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      this.loggerService.log('Solicitud de login recibida', 'AuthController', {
        email: loginDto.email,
      });

      const result = await this.authService.login(loginDto);

      this.loggerService.success(
        'Login completado exitosamente via API',
        'AuthController',
        { email: loginDto.email },
      );

      return {
        status: 'success',
        message: 'Login exitoso',
        data: result,
      };
    } catch (error) {
      this.loggerService.error('Error en login via API', 'AuthController', {
        email: loginDto.email,
        error: error.message,
      });
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }
  }
}
