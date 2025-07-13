import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import { LoggerService, ConfigurationService } from '../../common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigurationService,
  ) {
    // Validar configuración del módulo Auth al inicializar
    this.configService.logModuleConfig('auth');
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { username, email, password, locationId } = registerDto;

    this.loggerService.log(`Intento de registro de usuario`, 'AuthService', {
      email,
      username,
      locationId,
    });

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      this.loggerService.warn(
        `Intento de registro con email ya existente`,
        'AuthService',
        { email },
      );
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

    try {
      const user = await this.userService.create(userData);
      const userDoc = user as any;

      const token = await this.userService.generateUserToken(
        userDoc._id.toString(),
      );

      this.loggerService.success(
        `Usuario registrado exitosamente`,
        'AuthService',
        { email, username, userId: userDoc._id },
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
    } catch (error) {
      this.loggerService.error(
        `Error durante el registro de usuario`,
        'AuthService',
        { email, username, error: error.message },
      );
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    this.loggerService.log(`Intento de login`, 'AuthService', { email });

    const user = await this.userService.findByEmail(email);
    if (!user) {
      this.loggerService.warn(
        `Intento de login con email no registrado`,
        'AuthService',
        { email },
      );
      throw new HttpException(
        'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.loggerService.warn(
        `Intento de login con contraseña incorrecta`,
        'AuthService',
        { email },
      );
      throw new HttpException(
        'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const userDoc = user as any;

      const token = await this.userService.generateUserToken(
        userDoc._id.toString(),
      );

      this.loggerService.success(`Login exitoso`, 'AuthService', {
        email,
        userId: userDoc._id,
      });

      return {
        token,
        user: {
          id: userDoc._id,
          username: user.username,
          email: user.email,
          locationId: user.locationId,
        },
      };
    } catch (error) {
      this.loggerService.error(`Error durante el login`, 'AuthService', {
        email,
        error: error.message,
      });
      throw error;
    }
  }

  async validateToken(token: string) {
    try {
      const user = await this.userService.findByToken(token);
      if (!user) {
        this.loggerService.warn(
          `Validación fallida - Token no encontrado`,
          'AuthService',
          { tokenPrefix: token?.substring(0, 10) + '...' },
        );
        throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
      }

      this.loggerService.debug(`Token validado exitosamente`, 'AuthService', {
        email: user.email,
      });

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.loggerService.error(
        `Error durante validación de token`,
        'AuthService',
        { error: error.message },
      );
      throw new HttpException(
        'Error interno',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
