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
import { Arguments, InferredOptionTypes } from 'yargs';

enum Action {
  AllTokensList = 'alltokenslist',
  Arbify = 'arbify',
  Full = 'full',
  Permit = 'permit',
  Update = 'update',
  CrossChain = 'crosschain',
}
const options = {
  l2NetworkID: {
    type: 'number',
    demandOption: false, // Only optional for cross-chain lists
  },
  crossChain: {
    type: 'boolean',
    demandOption: false,
  },
  tokenList: {
    type: 'string',
    demandOption: true,
  },
  newArbifiedList: {
    type: 'string',
    demandOption: true,
  },
  includeOldDataFields: {
    type: 'boolean',
  },
  includePermitTags: {
    type: 'boolean',
  },
  skipValidation: {
    type: 'boolean',
    default: false,
  },
  ignorePreviousList: {
    type: 'boolean',
    default: false,
  },
  // This is required, but setting required here would disallow setting it to false when `ignorePreviousList` is true
  prevArbifiedList: {
    type: 'string',
  },
} as const;

const yargsInstance = yargs(hideBin(process.argv))
  .options(options)
  .check(({ ignorePreviousList, prevArbifiedList }) => {
    if (ignorePreviousList && !prevArbifiedList) {
      return true;
    }

    if (!ignorePreviousList && prevArbifiedList) {
      return true;
    }

    return false;
  })
  .check(({ l2NetworkID, crossChain }) => {
    if (l2NetworkID && !crossChain) {
      return true;
    }

    if (!l2NetworkID && crossChain) {
      return true;
    }

    return false;
  });

type Args = Arguments<InferredOptionTypes<typeof options>>;

const getArgvs = () => yargsInstance.parseSync();

export { Action, options, Args, getArgvs, yargsInstance };
