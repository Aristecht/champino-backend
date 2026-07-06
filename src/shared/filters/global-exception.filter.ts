import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GlobalExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const contextType = host.getType();

    // Если это HTTP-запрос (REST), передаём ошибку NestJS-обработчику
    if (contextType === 'http') {
      throw exception;
    }

    // GraphQL контекст
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      this.logger.warn(
        `GraphQL HttpException (${status}): ${JSON.stringify(response)}`,
      );

      throw new GraphQLError(exception.message, {
        extensions: {
          code:
            status === HttpStatus.TOO_MANY_REQUESTS
              ? 'RATE_LIMIT'
              : status === HttpStatus.UNAUTHORIZED
                ? 'UNAUTHORIZED'
                : status === HttpStatus.NOT_FOUND
                  ? 'NOT_FOUND'
                  : status === HttpStatus.CONFLICT
                    ? 'CONFLICT'
                    : status === HttpStatus.BAD_REQUEST
                      ? 'BAD_REQUEST'
                      : 'INTERNAL_ERROR',
          httpStatus: status,
          ...(typeof response === 'object' && response !== null
            ? { details: response }
            : {}),
        },
      });
    }

    // Неожиданная ошибка
    this.logger.error(
      'Unhandled GraphQL error:',
      exception instanceof Error ? exception.stack : exception,
    );

    throw new GraphQLError('Внутренняя ошибка сервера', {
      extensions: {
        code: 'INTERNAL_ERROR',
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    });
  }
}
