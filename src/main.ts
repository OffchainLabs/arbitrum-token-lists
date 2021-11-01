import { getTokenListObj, getTokenListObjFromUrl } from './lib/utils';
import {
  generateTokenList,
  arbifyL1List,
  updateArbifiedList,
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
    const tokenData = await generateTokenList('all', 'Full');
    
    writeFileSync(path, JSON.stringify(tokenData));
    const etherscanData = arbListtoEtherscanList(tokenData)
    const fullListPath = __dirname + '/FullList/all_tokens.json';
    writeFileSync(fullListPath, JSON.stringify(etherscanData));

  } else if (args.action === 'update') {
    if (!args.fileName) throw new Error('No file name provided');
    updateArbifiedList(__dirname + `/ArbTokenLists/${args.fileName}`);
  }
})();
