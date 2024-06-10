import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import './customNetworks';

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
