import { getTokenListObj, getTokenListObjFromUrl } from './lib/utils';
import {
  generateTokenList,
  arbifyL1List,
  arbListtoEtherscanList,
  updateArbifiedList,
} from './lib/token_list_gen';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import args from './lib/getClargs';
import { TokenList } from '@uniswap/token-lists';
import { generateNovaTokenList, novaifyL1List, novaListtoEtherscanList, updateNovaifiedList } from './lib/nova_token_list_gen';

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

    await arbifyL1List(args.tokenList, !!args.includeOldDataFields);
  }  else if(args.action === "update") {
    if (!args.tokenList) throw new Error('No token list provided');

    await updateArbifiedList(args.tokenList)
  }
  
  else if (args.action === 'full') {
    const mockList: TokenList = {
      name: "Full",
      logoURI: "ipfs://QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y",
      timestamp: new Date().toISOString(),
      version: {
        major: 1,
        minor: 0,
        patch: 0
      },
      tokens: []
    }
    const tokenData = await generateTokenList(mockList, undefined, { getAllTokensInNetwork: true });
    
    const etherscanData = arbListtoEtherscanList(tokenData)
    const fullListPath = __dirname + '/FullList/all_tokens.json';
    writeFileSync(fullListPath, JSON.stringify(etherscanData));
    console.log('List generated at', fullListPath);

  }
  else if (args.action === 'novaify') {
    if (!args.tokenList) throw new Error('No token list provided');

    await novaifyL1List(args.tokenList, !!args.includeOldDataFields);
  }
    else if(args.action === "updateNova") {
    if (!args.tokenList) throw new Error('No token list provided');

    await updateNovaifiedList(args.tokenList)
    }

    else if (args.action === 'fullNova') {
    const mockList: TokenList = {
      name: "Full",
      logoURI: "ipfs://QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y",
      timestamp: new Date().toISOString(),
      version: {
        major: 1,
        minor: 0,
        patch: 0
      },
      tokens: []
    }
    const tokenData = await generateNovaTokenList(mockList, undefined, { getAllTokensInNetwork: true });

    const etherscanData = novaListtoEtherscanList(tokenData)
    const fullListPath = __dirname + '/FullList/all_tokens.json';
    writeFileSync(fullListPath, JSON.stringify(etherscanData));
    console.log('List generated at', fullListPath);

    }
})();
