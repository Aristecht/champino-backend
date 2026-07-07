import { join } from 'path';
import { type ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigService } from '@nestjs/config';
import {
  GraphQLError,
  isCompositeType,
  Kind,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  type ASTVisitor,
  type ValidationContext,
} from 'graphql';

import { isDev } from '../../shared/utils/is-dev.util';

/**
 * Кастомная валидация глубины GraphQL-запроса.
 * Аналог `graphql-depth-limit`, но совместимый с graphql v16+.
 * Ограничивает максимальную глубину вложенности (default: 6 уровней).
 *
 * ВНИМАНИЕ: Не используем `graphql-depth-limit` — пакет не обновлялся
 * с 2021 года и несовместим с graphql v16 (ValidationContext API изменился).
 */
function depthLimitValidator(maxDepth: number, ignore: string[] = []) {
  return (context: ValidationContext): ASTVisitor => {
    const schema = context.getSchema();
    const typeInfo = new TypeInfo(schema);
    const document = context.getDocument();
    const definitions = document.definitions;
    const fragments: Record<string, { depth: number }> = {};

    // Сначала вычисляем глубину для каждого фрагмента
    for (const def of definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) {
        let depth = 0;
        let currentDepth = 0;

        visit(
          def.selectionSet,
          visitWithTypeInfo(typeInfo, {
            enter(node) {
              if (node.kind === Kind.FIELD) {
                const type = typeInfo.getType();
                if (type && isCompositeType(type)) {
                  currentDepth++;
                  if (currentDepth > depth) depth = currentDepth;
                }
              }
            },
            leave(node) {
              if (node.kind === Kind.FIELD) {
                const type = typeInfo.getType();
                if (type && isCompositeType(type)) {
                  currentDepth--;
                }
              }
            },
          }),
        );

        fragments[def.name.value] = { depth };
      }
    }

    // Для каждой операции проверяем глубину
    return {
      OperationDefinition: {
        enter(node) {
          let depth = 0;
          let currentDepth = 0;

          visit(
            node,
            visitWithTypeInfo(typeInfo, {
              enter(childNode) {
                if (childNode.kind === Kind.FIELD) {
                  if (ignore.includes(childNode.name.value)) return;

                  const type = typeInfo.getType();
                  if (type && isCompositeType(type)) {
                    currentDepth++;
                    if (currentDepth > depth) depth = currentDepth;
                  }
                }
                if (childNode.kind === Kind.FRAGMENT_SPREAD) {
                  const frag = fragments[childNode.name.value];
                  if (frag) {
                    const totalDepth = currentDepth + frag.depth;
                    if (totalDepth > depth) depth = totalDepth;
                  }
                }
              },
              leave(childNode) {
                if (childNode.kind === Kind.FIELD) {
                  const type = typeInfo.getType();
                  if (type && isCompositeType(type)) {
                    currentDepth--;
                  }
                }
              },
            }),
          );

          if (depth > maxDepth) {
            context.reportError(
              new GraphQLError(
                `Превышена максимальная глубина запроса: ${depth} > ${maxDepth}. Разрешено не более ${maxDepth} уровней вложенности.`,
              ),
            );
          }
        },
      },
    };
  };
}

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
    // В production: отключаем introspection
    // validationRules временно отключены для диагностики 502
    ...(dev ? {} : {}),
  };
}
