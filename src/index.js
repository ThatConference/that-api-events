import 'dotenv/config';
import express from 'express';
import debug from 'debug';
import { Firestore } from '@google-cloud/firestore';
import responseTime from 'response-time';
import uuid from 'uuid/v4';
import * as Sentry from '@sentry/node';

import apolloGraphServer from './graphql';
// import { version } from '../package.json';

let version;
(async () => {
  let p;
  try {
    p = await import('./package.json');
  } catch {
    p = await import('../package.json');
  }
  version = p.version;
})();

const dlog = debug('that:api:events:index');
const defaultVersion = `that-api-events@${version}`;
const firestore = new Firestore();
const api = express();

dlog('function instance created');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  release: process.env.SENTRY_VERSION || defaultVersion,
  debug: process.env.NODE_ENV === 'development',
});

Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'that-api-events');
});

const createConfig = () => {
  dlog('createConfig');

  return {
    dataSources: {
      sentry: Sentry,
      firestore,
    },
  };
};

const graphServer = apolloGraphServer(createConfig());

function sentryMark(req, res, next) {
  Sentry.addBreadcrumb({
    category: 'root',
    message: 'init',
    level: Sentry.Severity.Info,
  });
  next();
}

function createUserContext(req, res, next) {
  const enableMocking = () => {
    if (!req.headers['that-enable-mocks']) return false;

    const headerValues = req.headers['that-enable-mocks'].split(',');
    const mocks = headerValues.map(i => i.trim().toUpperCase());

    return !!mocks.includes('EVENTS');
  };

  const correlationId = req.headers['that-correlation-id']
    ? req.headers['that-correlation-id']
    : uuid();

  Sentry.configureScope(scope => {
    scope.setTag('correlationId', correlationId);
  });

  req.userContext = {
    authToken: req.headers.authorization,
    correlationId,
    enableMocking: enableMocking(),
  };

  next();
}

function failure(err, req, res, next) {
  dlog('error %o', err);
  Sentry.captureException(err);

  res
    .set('Content-Type', 'application/json')
    .status(500)
    .json(err);
}

api
  .set('etag', false)
  .use(responseTime())
  .use(sentryMark)
  .use(createUserContext)
  .use(failure);

graphServer.applyMiddleware({ app: api, path: '/' });
const port = process.env.PORT || 8001;
api.listen({ port }, () => dlog(`events running on %d`, port));
