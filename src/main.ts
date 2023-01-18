#!/usr/bin/env node
import { yargsInstance } from './lib/options';
import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import {
  command as commandUpdate,
  describe as describeUpdate,
  handler as handlerUpdate,
} from './commands/update';
import {
  command as commandArbify,
  describe as describeArbify,
  handler as handlerArbify,
} from './commands/arbify';
import {
  command as commandFull,
  describe as describeFull,
  handler as handlerFull,
} from './commands/full';
import {
  command as commandAllTokensList,
  describe as describeAllTokensList,
  handler as handlerAllTokensList,
} from './commands/allTokensList';

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const update: any = yargsInstance.command(
  commandUpdate,
  describeUpdate,
  {},
  // @ts-ignore: handler returns list so we can compare the result in test, yargs expect handler to return void
  handlerUpdate
);

const arbify = yargsInstance.command(
  commandArbify,
  describeArbify,
  {},
  // @ts-ignore: handler returns list so we can compare the result in test, yargs expect handler to return void
  handlerArbify
);
const full = yargsInstance.command(
  commandFull,
  describeFull,
  {},
  // @ts-ignore: handler returns list so we can compare the result in test, yargs expect handler to return void
  handlerFull
);
const alltokenslist = yargsInstance.command(
  commandAllTokensList,
  describeAllTokensList,
  {},
  // @ts-ignore: handler returns list so we can compare the result in test, yargs expect handler to return void
  handlerAllTokensList
);

if (process.env.NODE_ENV !== 'test') {
  update.parseAsync();
  arbify.parseAsync();
  full.parseAsync();
  alltokenslist.parseAsync();
}

export { update, yargsInstance };
