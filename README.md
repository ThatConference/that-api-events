# template-graph-server

[![Actions Status](https://github.com/ThatConference/that-api-events/workflows/Push%20Master%20CI/badge.svg)](https://github.com/ThatConference/that-api-events/workflows/actions)

## Setup and Configuration

- Install node.js in use: `nodenv install $(cat .node_version)`
- Load dependencies: `npm i`

setup notes:

- we use nodenv to manage node.js - [https://github.com/nodenv/nodenv](https://github.com/nodenv/nodenv)

## .env

You will need to add a `.env` file to your source. See the .env.sample included in the source base for the keys.

## Running

The main development starting point is `npm run start:watch`

- `npm run start:watch` to run with a watcher.
- `npm run start` to just run`.

## Endpoints

- Endpoint: [http://localhost:8001/](http://localhost:8001/) or [http://localhost:8001/graphql](http://localhost:8001/graphql)
