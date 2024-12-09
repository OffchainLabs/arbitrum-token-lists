import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { customNetworks } from './customNetworks';
import { addCustomNetwork } from '@arbitrum/sdk';

Object.values(customNetworks).forEach((network) => {
  addCustomNetwork({ customL2Network: network });
});

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
