import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoggerService } from '../../common/services/logger.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly loggerService: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const endpoint = `${request.method} ${request.path}`;

    if (!authorization) {
      this.loggerService.warn(
        `Acceso denegado - Token no proporcionado`,
        'AuthGuard',
        { endpoint, ip: request.ip },
      );
      throw new UnauthorizedException('Token de autorización requerido');
    }

    const token = this.extractTokenFromHeader(authorization);
    if (!token) {
      this.loggerService.warn(
        `Acceso denegado - Formato de token inválido`,
        'AuthGuard',
        { endpoint, ip: request.ip },
      );
      throw new UnauthorizedException('Formato de token inválido');
    }

    try {
      const user = await this.authService.validateToken(token);
      if (!user) {
        this.loggerService.warn(
          `Acceso denegado - Token inválido`,
          'AuthGuard',
          {
            endpoint,
            ip: request.ip,
            tokenPrefix: token.substring(0, 10) + '...',
          },
        );
        throw new UnauthorizedException('Token inválido');
      }

      request.user = user;

      this.loggerService.debug(`Acceso autorizado`, 'AuthGuard', {
        endpoint,
        email: user.email,
        locationId: user.locationId,
      });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.loggerService.error(
        `Error durante validación de autorización`,
        'AuthGuard',
        { endpoint, error: error.message, ip: request.ip },
      );
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractTokenFromHeader(authorization: string): string | null {
    const [type, token] = authorization.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
