import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Guard для rate limiting на GraphQL резолверах.
 * Используется ТОЛЬКО через @UseGuards() на конкретных мутациях.
 * Не применяется как глобальный guard — это ломает REST-запросы.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    try {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext();

      if (ctx && ctx.req) {
        return { req: ctx.req, res: ctx.res };
      }

      // REST контекст
      const http = context.switchToHttp();
      const req = http.getRequest();
      const res = http.getResponse();
      if (req && req.header) {
        return { req, res };
      }
    } catch {
      // Если контекст не удалось определить — пропускаем запрос
    }

    // fallback: пустой request — rate limiting не применяется
    const dummyReq = { ip: '0.0.0.0', header: () => '' } as any;
    const dummyRes = {} as any;
    return { req: dummyReq, res: dummyRes };
  }
}
