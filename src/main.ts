import { getTokenListObj, getTokenListObjFromUrl } from './lib/utils';
import {
  generateTokenList,
  arbifyL1List,
  updateArbifiedList,
} from './lib/token_list_gen';
import { writeFileSync } from 'fs';
import args from './lib/getClargs';
(async () => {
  if (args.action === 'arbify') {
    if (!args.tokenList) throw new Error('No token list provided');

    await arbifyL1List(args.tokenList);
  } else if (args.action === 'full') {
    const path = __dirname + '/ArbTokenLists/arbitrum_one.json';
    const tokenData = await generateTokenList('all', 'Arbitrum One OGs');
    writeFileSync(path, JSON.stringify(tokenData));
  } else if (args.action === 'update') {
    if (!args.fileName) throw new Error('No file name provided');
    updateArbifiedList(__dirname + `/ArbTokenLists/${args.fileName}`);
  }
})();
