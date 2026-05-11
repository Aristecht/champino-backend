import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { type User } from '../../../prisma/generated/prisma/client';

export const Authorized = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    let user: User | null = null;

    if (ctx.getType() === 'http') {
      user = ctx.switchToHttp().getRequest().user;
    } else {
      const context = GqlExecutionContext.create(ctx);
      user = context.getContext().req.user;
    }

    if (!user) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }

    return data ? user[data] : user;
  },
);
