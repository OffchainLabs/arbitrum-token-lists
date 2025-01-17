import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

import { customNetworks } from './customNetworks';

(async () => {
  customNetworks.forEach((network) => registerCustomArbitrumNetwork(network));
})();
