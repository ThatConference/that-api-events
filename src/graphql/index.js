import { isNil } from 'lodash';
import { ApolloServer } from 'apollo-server-express';
import { buildSubgraphSchema } from '@apollo/subgraph';
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
 * will create you a configured instance of an apollo gateway
 * @param {object} userContext - user context that w
 * @return {object} a configured instance of an apollo gateway.
 *
 * @example
 *
 *     createGateway(userContext)
 */
const createServer = ({ dataSources }) => {
  dlog('creating apollo server');
  let schema = {};

  dlog('build subgraph schema');
  schema = buildSubgraphSchema([{ typeDefs, resolvers }]);

  const directiveTransformers = [
    directives.auth('auth').authDirectiveTransformer,
    directives.lowerCase('lowerCase').lowerCaseDirectiveTransformer,
  ];

  dlog('directiveTransformers: %O', directiveTransformers);
  schema = directiveTransformers.reduce(
    (curSchema, transformer) => transformer(curSchema),
    schema,
  );

  return new ApolloServer({
    schema,
    introspection: JSON.parse(process.env.ENABLE_GRAPH_INTROSPECTION || false),
    dataSources: () => {
      dlog('creating dataSources');
      const { firestore } = dataSources;

      const eventLoader = new DataLoader(ids =>
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
      );

      const communityLoader = new DataLoader(ids =>
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
      );

      return {
        ...dataSources,
        eventLoader,
        communityLoader,
      };
    },
    csrfPrevention: true,
    cache: 'bounded',
    context: async ({ req, res }) => {
      dlog('building graphql user context');
      let context = {};

      dlog('auth header %o', req.headers);
      if (!isNil(req.headers.authorization)) {
        dlog('validating token for %o:', req.headers.authorization);

        Sentry.addBreadcrumb({
          category: 'graphql context',
          message: 'user has authToken',
          level: 'info',
        });

        const validatedToken = await jwtClient.verify(
          req.headers.authorization,
        );

        Sentry.configureScope(scope => {
          scope.setUser({
            id: validatedToken.sub,
            permissions: validatedToken.permissions.toString(),
          });
        });

        dlog('validated token: %o', validatedToken);
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
    },
    plugins: [],
    formatError: err => {
      dlog('formatError %O', err);

      Sentry.withScope(scope => {
        scope.setTag('formatError', true);
        scope.setLevel('warning');

        scope.setExtra('originalError', err.originalError);
        scope.setExtra('path', err.path);

        Sentry.captureException(err);
      });

      return err;
    },
  });
};

export default createServer;
