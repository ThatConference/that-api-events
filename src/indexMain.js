/* eslint-disable import/no-unresolved */
/* eslint-disable no-console */
import http from 'node:http';
import express from 'express';
import { json } from 'body-parser';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import debug from 'debug';
import { Firestore } from '@google-cloud/firestore';
import { Client as Postmark } from 'postmark';
import responseTime from 'response-time';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';

import apolloGraphServer from './graphql';
import envConfig from './envConfig';
import userEventEmitter from './events/user';
import { version } from './package.json';

const dlog = debug('that:api:events:index');
const defaultVersion = `that-api-events@${version}`;
const firestore = new Firestore();
const postmark = new Postmark(envConfig.postmarkApiToken);
const userEvents = userEventEmitter(postmark);
const api = express();
const port = process.env.PORT || 8001;

dlog('function instance created');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  release: process.env.SENTRY_VERSION || defaultVersion,
  debug: process.env.NODE_ENV === 'development',
  normalizeDepth: 6,
});

Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'that-api-events');
});

const httpServer = http.createServer(api);

const createConfig = () => {
  dlog('createConfig');

  return {
    dataSources: {
      sentry: Sentry,
      firestore,
      postmark,
      events: {
        userEvents,
      },
    },
    httpServer,
  };
};

const graphServerParts = apolloGraphServer(createConfig());

function sentryMark(req, res, next) {
  Sentry.addBreadcrumb({
    category: 'that-api-events',
    message: 'events init',
    level: 'info',
  });

  next();
}

function createUserContext(req, res, next) {
  dlog('creating user context');

  const correlationId =
    req.headers['that-correlation-id'] &&
    req.headers['that-correlation-id'] !== 'undefined'
      ? req.headers['that-correlation-id']
      : uuidv4();

  Sentry.configureScope(scope => {
    scope.setTag('correlationId', correlationId);
    scope.setContext('headers', {
      headers: req.headers,
    });
  });

  let site;
  if (req.headers['that-site']) {
    site = req.headers['that-site'];
  } else if (req.headers['x-forwarded-for']) {
    // eslint-disable-next-line no-useless-escape
    const rxHost = /^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i;
    const refererHost = req.headers['x-forwarded-for'];
    const host = refererHost.match(rxHost);
    if (host) [, site] = host;
  } else {
    site = 'www.thatconference.com';
  }

  Sentry.configureScope(scope => {
    scope.setTag('site', site);
  });

  req.userContext = {
    locale: req.headers.locale,
    authToken: req.headers.authorization,
    correlationId,
    site,
  };
  dlog('headers %o', req.headers);
  dlog('userContext %o', req.userContext);

  next();
}

function getVersion(req, res) {
  dlog('method %s, defaultVersion %s', req.method, defaultVersion);
  return res.json({ version: defaultVersion });
}

function failure(err, req, res, next) {
  dlog('error %o', err);
  Sentry.captureException(err);

  res.set('Content-Type', 'application/json').status(500).json(err);
}

api.use(
  Sentry.Handlers.requestHandler(),
  cors(),
  responseTime(),
  json(),
  sentryMark,
  createUserContext,
);
api.use('/version', getVersion);

const { graphQlServer, createContext } = graphServerParts;

graphQlServer
  .start()
  .then(() => {
    api.use(
      expressMiddleware(graphQlServer, {
        context: async ({ req }) => createContext({ req }),
      }),
    );
  })
  .catch(err => {
    console.log(`graphServer.start() error 💥: ${err.message}`);
    throw err;
  });

api.use(Sentry.Handlers.errorHandler()).use(failure);

api.listen({ port }, () =>
  console.log(`⚡ Events 🕰 is running on 🚢 port ${port}`),
);
