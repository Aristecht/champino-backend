import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    // Проверяем, является ли контекст GraphQL
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();

    if (ctx?.req) {
      // GraphQL запрос
      return { req: ctx.req, res: ctx.res };
    }

    // REST запрос (например health check, webhook)
    const http = context.switchToHttp();
    return { req: http.getRequest(), res: http.getResponse() };
  }
}
