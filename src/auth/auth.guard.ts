import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Token de autorización requerido');
    }

    const token = this.extractTokenFromHeader(authorization);
    if (!token) {
      throw new UnauthorizedException('Formato de token inválido');
    }

    try {
      const user = await this.authService.validateToken(token);
      if (!user) {
        throw new UnauthorizedException('Token inválido');
      }

      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractTokenFromHeader(authorization: string): string | null {
    const [type, token] = authorization.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
