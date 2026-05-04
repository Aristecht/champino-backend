import { join } from 'path';
import { type ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigService } from '@nestjs/config';

import { isDev } from '../../shared/utils/is-dev.util';

export function getGraphQLConfig(
  configService: ConfigService,
): ApolloDriverConfig {
  const apiPrefix =
    configService.get<string>('API_PREFIX')?.replace(/^\/+|\/+$/g, '') ?? '';
  const graphqlPrefix = configService
    .getOrThrow<string>('GRAPHQL_PREFIX')
    .replace(/^\/+/, '');

  return {
    playground: isDev(configService),
    path: apiPrefix ? `/${apiPrefix}/${graphqlPrefix}` : `/${graphqlPrefix}`,
    autoSchemaFile: join(process.cwd(), 'src/core/graphql/schema.gql'),
    sortSchema: true,
    context: ({ req, res }) => ({ req, res }),
    introspection: true,
  };
}
