import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('API ключ отсутствует');
    }

    const token = authHeader.slice(7);
    const expected = process.env.ROSTA_LOYALTY_API_KEY;

    if (!expected) {
      throw new UnauthorizedException('API ключ не настроен на сервере');
    }

    if (token !== expected) {
      throw new UnauthorizedException('Неверный API ключ');
    }

    return true;
  }
}
