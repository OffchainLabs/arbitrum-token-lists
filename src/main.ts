import {
  arbifyL1List,
  updateArbifiedList,
  generateFullList,
  generateFullListFormatted,
} from './lib/token_list_gen';
import { addPermitTags } from './PermitTokens/permitSignature';
import { ArbTokenList } from './lib/types';
import { writeToFile, getPath } from './lib/store';
import { ETHERSCAN_LIST_NAME } from './lib/constants';
import { options, Action } from './lib/getClargs';

options.command(
  '$0',
  'the default command',
  () => {},
  async argvs => {
    if (argvs.action === Action.Full) {
      if (argvs.tokenList !== 'full')
        throw new Error("expected --tokenList 'full'");
      if (argvs.includePermitTags)
        throw new Error('full list mode does not support permit tagging');

      return writeToFile(
        await generateFullList(argvs.skipValidation),
        getPath(ETHERSCAN_LIST_NAME)
      );
    }

    let tokenList: ArbTokenList;
    let path: string;
    const includeOldDataFields: boolean = !!argvs.includeOldDataFields;

    if (argvs.action === Action.Arbify) {
      const { newList, l1ListName } = await arbifyL1List(
        argvs.tokenList,
        includeOldDataFields,
        argvs.skipValidation
      );
      tokenList = newList;
      path = getPath(l1ListName);
    } else if (argvs.action === Action.Update) {
      const { newList, path: _path } = await updateArbifiedList(
        argvs.tokenList,
        includeOldDataFields,
        argvs.skipValidation
      );
      tokenList = newList;
      path = _path;
    } else if (argvs.action === Action.Alltokenslist) {
      tokenList = await generateFullListFormatted(argvs.skipValidation);
      path = getPath('full');
    } else {
      throw new Error(`action ${argvs.action} not recognised`);
    }

    if (argvs.includePermitTags) tokenList = await addPermitTags(tokenList);
    writeToFile(tokenList, path);
  }
).argv;
