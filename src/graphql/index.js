import { isNil } from 'lodash';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import debug from 'debug';
import { security } from '@thatconference/api';
import DataLoader from 'dataloader';
import * as Sentry from '@sentry/node';

// Graph Types and Resolvers
import typeDefs from './typeDefs';
import resolvers from './resolvers';
import directives from './directives';
import eventStore from '../dataSources/cloudFirestore/event';
import communityStore from '../dataSources/cloudFirestore/community';

const dlog = debug('that:api:events:graphServer');
const jwtClient = security.jwt();

/**
 * creates an Apollo server instance and the context
 * Both are returned separately as the context is added to
 * Expressjs directly
 * @param {object} datasources - datasources to add to context
 * @param {object} httpServer - required for Apollo connection drain
 *
 * @return {object}
 */
const createServerParts = ({ dataSources, httpServer }) => {
  dlog('🚜 creating apollo server and context');
  let schema = {};

  dlog('🚜 building subgraph schema');
  schema = buildSubgraphSchema([{ typeDefs, resolvers }]);

  const directiveTransformers = [
    directives.auth('auth').authDirectiveTransformer,
    directives.lowerCase('lowerCase').lowerCaseDirectiveTransformer,
  ];

  dlog('🚜 adding directiveTransformers: %O', directiveTransformers);
  schema = directiveTransformers.reduce(
    (curSchema, transformer) => transformer(curSchema),
    schema,
  );

  dlog('🚜 assembling datasources');
  const { firestore } = dataSources;
  const amendedDataSources = {
    ...dataSources,
    eventLoader: new DataLoader(ids =>
      eventStore(firestore)
        .getBatch(ids)
        .then(events => {
          if (events.includes(null)) {
            Sentry.withScope(scope => {
              scope.setLevel('error');
              scope.setContext(
                `Assigned Event's don't exist in events Collection`,
                { ids },
                { events },
              );
              Sentry.captureMessage(
                `Assigned Event's don't exist in events Collection`,
              );
            });
          }
          return ids.map(id => events.find(e => e && e.id === id));
        }),
    ),
    communityLoader: new DataLoader(ids =>
      communityStore(firestore)
        .getBatch(ids)
        .then(communities => {
          if (communities.includes(null)) {
            Sentry.withScope(scope => {
              scope.setLevel('error');
              scope.setContext(
                `Assigned Community's don't exist in communities Collection`,
                { ids },
                { communities },
              );
              Sentry.captureMessage(
                `Assigned Community's don't exist in communities Collection`,
              );
            });
          }
          return ids.map(id => communities.find(e => e && e.id === id));
        }),
    ),
  };

  dlog('🚜 creating new apollo server instance');
  const graphQlServer = new ApolloServer({
    schema,
    introspection: JSON.parse(process.env.ENABLE_GRAPH_INTROSPECTION || false),
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: err => {
      dlog('formatError %O', err);

      Sentry.withScope(scope => {
        scope.setTag('formatError', true);
        scope.setLevel('warning');

        scope.setContext('setExtra', {
          originalError: err.originalError,
          path: err.path,
        });
        Sentry.captureException(err);
      });

      return err;
    },
  });

  dlog('🚜 creating createContext function');
  const createContext = async ({ req, res }) => {
    dlog('🚜 building graphql user context');
    let context = {
      dataSources: {
        ...amendedDataSources,
      },
    };

    dlog('🚜 auth header %o', req.headers);
    if (!isNil(req.headers.authorization)) {
      dlog('🚜 validating token for %o:', req.headers.authorization);

      Sentry.addBreadcrumb({
        category: 'graphql context',
        message: 'user has authToken',
        level: 'info',
      });

      const validatedToken = await jwtClient.verify(req.headers.authorization);

      Sentry.configureScope(scope => {
        scope.setUser({
          id: validatedToken.sub,
          permissions: validatedToken.permissions.toString(),
        });
      });

      dlog('🚜 validated token: %o', validatedToken);
      context = {
        ...context,
        user: {
          ...validatedToken,
          site: req.userContext.site,
          correlationId: req.userContext.correlationId,
        },
      };
    }

    return context;
  };

  return {
    graphQlServer,
    createContext,
  };
};

export default createServerParts;
