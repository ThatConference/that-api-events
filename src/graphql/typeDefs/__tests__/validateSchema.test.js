/* resolvers use thatconference/api which needs these env variables. */
/* this test is more about successfully building the schema then the
 * resulting schema from the build.
 */
import { buildSubgraphSchema } from '@apollo/subgraph';
import typeDefs from '../../typeDefs';
import resolvers from '../../resolvers';
import directives from '../../directives';
import { ApolloServer } from 'apollo-server-express';

let originalEnv;

describe('validate schema test', () => {
  beforeAll(() => {
    originalEnv = process.env;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /* Checking directives is not working. Fails on auth:
   * * ReferenceError: defaultFieldResolver is not defined
   */
  // const directives = require('../../directives').default;
  // import directives from '../../directives';

  let schema = buildSubgraphSchema([{ typeDefs, resolvers }]);
  // SchemaDirectiveVisitor.visitSchemaDirectives(schema, directives);

  describe('Validate graphql schema', () => {
    it('schema has successfully built and is and object', () => {
      // TODO: find other ways to validate schema
      expect(typeof schema).toBe('object');
      expect(schema).toBeInstanceOf(Object);
    });
    it('will add auth directive successfully', () => {
      const { authDirectiveTransformer } = directives.auth('auth');
      schema = authDirectiveTransformer(schema);
      // TODO: find other ways to validate schema
      expect(typeof schema).toBe('object');
      expect(schema).toBeInstanceOf(Object);
    });
    it('will run in server correctly', () => {
      const serv = new ApolloServer({ schema });
      expect(typeof serv).toBe('object');
      expect(serv?.graphqlPath).toBe('/graphql');
      expect(serv?.requestOptions?.nodeEnv).toBe('test');
    });
  });
});
