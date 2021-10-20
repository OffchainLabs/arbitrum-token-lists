import { getTokenListObj, getTokenListObjFromUrl } from './lib/utils';
import { generateTokenList } from './lib/token_list_gen';
import { writeFileSync } from 'fs';
import axios from 'axios';
(async () => {
  // const data = await getAllTokens();

  // const path = __dirname + '/ArbTokenLists/arbitrum_one.json';
  // writeFileSync(path, JSON.stringify(data));
  const x = await generateTokenList('all')
  console.log('x',x );
  

})();
