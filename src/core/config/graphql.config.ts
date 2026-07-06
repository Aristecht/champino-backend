import { join } from 'path';
import { type ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigService } from '@nestjs/config';
import depthLimit from 'graphql-depth-limit';

import { isDev } from '../../shared/utils/is-dev.util';

export function getGraphQLConfig(
  configService: ConfigService,
): ApolloDriverConfig {
  const apiPrefix =
    configService.get<string>('API_PREFIX')?.replace(/^\/+|\/+$/g, '') ?? '';
  const graphqlPrefix = configService
    .getOrThrow<string>('GRAPHQL_PREFIX')
    .replace(/^\/+/, '');

  const dev = isDev(configService);

  return {
    playground: dev,
    introspection: dev,
    path: apiPrefix ? `/${apiPrefix}/${graphqlPrefix}` : `/${graphqlPrefix}`,
    autoSchemaFile: join(process.cwd(), 'src/core/graphql/schema.gql'),
    sortSchema: true,
    context: ({ req, res }) => ({ req, res }),
    // В production: отключаем introspection + лимитируем глубину запроса (max 6 уровней)
    ...(dev
      ? {}
      : {
          validationRules: [depthLimit(6)],
        }),
  };
}
