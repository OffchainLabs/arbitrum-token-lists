import { getTokenListObj, getTokenListObjFromUrl } from './lib/utils';
import { generateTokenList, arbifyL1List } from './lib/token_list_gen';
import { writeFileSync } from 'fs';
import axios from 'axios';
(async () => {
  // const data = await getAllTokens();

  // const path = __dirname + '/ArbTokenLists/arbitrum_one.json';
  // writeFileSync(path, JSON.stringify(data));
  const x = await arbifyL1List('https://gateway.ipfs.io/ipns/tokens.uniswap.org')
    // const x = await generateTokenList('all', 'x')
   console.warn(x);
   
})();
