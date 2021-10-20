import { getTokenListObj, getTokenListObjFromUrl } from './lib/utils';
import { getAllTokens } from './lib/graph';
import { writeFileSync } from 'fs';
import axios from 'axios';
(async () => {
  const data = await getAllTokens();

  const path = __dirname + '/ArbTokenLists/arbitrum_one.json';
  writeFileSync(path, JSON.stringify(d));
})();
