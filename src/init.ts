import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { customNetworks } from './customNetworks';
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';

(async () => {
  for (const network of Object.values(customNetworks)) {
    registerCustomArbitrumNetwork(network);
  }
})();

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
