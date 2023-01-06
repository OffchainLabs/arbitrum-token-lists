/*
 * Copyright 2021, Offchain Labs, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

enum Action {
  Alltokenslist = 'alltokenslist',
  Arbify = 'arbify',
  Full = 'full',
  Permit = 'permit',
  Update = 'update',
}

const options = yargs(hideBin(process.argv)).options({
  l2NetworkID: {
    type: 'number',
    demandOption: true,
  },
  tokenList: {
    type: 'string',
    demandOption: true,
  },
  includeOldDataFields: {
    type: 'boolean',
  },
  action: {
    choices: [
      Action.Alltokenslist,
      Action.Arbify,
      Action.Full,
      Action.Permit,
      Action.Update,
    ],
    demandOption: true,
  },
  includePermitTags: {
    type: 'boolean',
  },
  skipValidation: {
    type: 'boolean',
    default: false,
  },
});

const argv = options.parseSync();
type Argv = typeof argv;

export { Action, argv, Argv, options };
