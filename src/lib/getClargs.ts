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

'use strict';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .options({
    l2NetworkID: {
      type: 'number',
    },
    tokenList: {
      type: 'string',
    },
    includeOldDataFields: {
      type: 'boolean',
    },
    action: {
      type: 'string',
    },
    includePermitTags: {
      type: 'boolean',
    },
    skipValidation: {
      type: 'boolean',
    },
  })
  .demandOption('action')
  .demandOption('l2NetworkID')
  .demandOption('tokenList')
  .parseSync();

export default argv;
