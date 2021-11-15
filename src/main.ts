import { getTokenListObj, getTokenListObjFromUrl } from './lib/utils';
import {
  generateTokenList,
  arbifyL1List,
  arbListtoEtherscanList,
} from './lib/token_list_gen';
import { writeFileSync } from 'fs';
import args from './lib/getClargs';
(async () => {
  if (args.action === 'arbify') {
    if (!args.tokenList) throw new Error('No token list provided');

    await arbifyL1List(args.tokenList);
  } else if (args.action === 'full') {
    const path = __dirname + '/ArbTokenLists/full.json';
    const tokenData = await generateTokenList('all', 'Full', "ipfs://QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y");
    
    writeFileSync(path, JSON.stringify(tokenData));
    const etherscanData = arbListtoEtherscanList(tokenData)
    const fullListPath = __dirname + '/FullList/all_tokens.json';
    writeFileSync(fullListPath, JSON.stringify(etherscanData));
    console.log('List generated at', fullListPath);

  }
})();
