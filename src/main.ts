import { getTokenListObj, getTokenListObjFromUrl } from './lib/utils';
import {
  generateTokenList,
  arbifyL1List,
  arbListtoEtherscanList,
} from './lib/token_list_gen';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import args from './lib/getClargs';

const TOKENLIST_DIR_PATH = __dirname +'/ArbTokenLists'
const FULLLIST_DIR_PATH = __dirname +'/FullList'

if(!existsSync(TOKENLIST_DIR_PATH)){
  console.log(`Setting up token list dir at ${TOKENLIST_DIR_PATH}`);  
  mkdirSync(TOKENLIST_DIR_PATH)
} 

if(!existsSync(FULLLIST_DIR_PATH)){
  console.log(`Setting up full list dir at ${FULLLIST_DIR_PATH}`);
  mkdirSync(FULLLIST_DIR_PATH)

} 

(async () => {
  if (args.action === 'arbify') {
    if (!args.tokenList) throw new Error('No token list provided');

    await arbifyL1List(args.tokenList);
  } else if (args.action === 'full') {
    const tokenData = await generateTokenList('all', 'Full', "ipfs://QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y");
    
    const etherscanData = arbListtoEtherscanList(tokenData)
    const fullListPath = __dirname + '/FullList/all_tokens.json';
    writeFileSync(fullListPath, JSON.stringify(etherscanData));
    console.log('List generated at', fullListPath);

  }
})();
