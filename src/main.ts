import { getTokenListObj, getTokenListObjFromUrl } from './lib/utils';
import {
  generateTokenList,
  arbifyL1List,
  arbListtoEtherscanList,
  updateArbifiedList,
  permitList,
  generateFullList,
} from './lib/token_list_gen';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import args from './lib/getClargs';
import { TokenList } from '@uniswap/token-lists';
import { ArbTokenList, EtherscanList } from './lib/types';
import { writeToFile } from './lib/store';

const TOKENLIST_DIR_PATH = __dirname + '/ArbTokenLists';
const FULLLIST_DIR_PATH = __dirname + '/FullList';

if (!existsSync(TOKENLIST_DIR_PATH)) {
  console.log(`Setting up token list dir at ${TOKENLIST_DIR_PATH}`);
  mkdirSync(TOKENLIST_DIR_PATH);
}

if (!existsSync(FULLLIST_DIR_PATH)) {
  console.log(`Setting up full list dir at ${FULLLIST_DIR_PATH}`);
  mkdirSync(FULLLIST_DIR_PATH);
}

const main = async () => {
  let tokenList: ArbTokenList | EtherscanList;

  if (args.action === 'arbify') {
    tokenList = await arbifyL1List(
      args.tokenList,
      !!args.includeOldDataFields
    );
  } else if (args.action === 'update') {

    tokenList = await updateArbifiedList(args.tokenList);

  } else if (args.action === 'full') {
    if (args.tokenList !== 'full')
      throw new Error("expected --tokenList 'full'");
    
      tokenList = await generateFullList()
  } else if (args.action === 'permit') {
    if (!args.tokenList) throw new Error('No token list provided');

    tokenList = await permitList(args.tokenList);
  } else {
    throw new Error(`action ${args.action} not recognised`);
  }

  writeToFile(tokenList)
};

main()
  .then(() => console.log("Done."))
  .catch((err) => {
    console.error(err)
    throw err
  });
