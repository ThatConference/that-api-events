import path from 'path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { productTypeEnum } from '@thatconference/schema';

const typesArray = loadFilesSync(path.join(__dirname, './**/*.graphql'), {
  recursive: true,
});

export default mergeTypeDefs([typesArray, productTypeEnum], { all: true });
