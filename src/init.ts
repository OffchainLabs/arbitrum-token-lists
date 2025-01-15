import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { customNetworks } from './customNetworks';
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';

(async () => {
  customNetworks.forEach((network) => registerCustomArbitrumNetwork(network));
})();

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
