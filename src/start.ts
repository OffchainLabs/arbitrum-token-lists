import {
  arbifyL1List,
  updateArbifiedList,
  generateFullList,
  generateFullListFormatted,
} from './lib/token_list_gen';
import { addPermitTags } from './PermitTokens/permitSignature';
import args from './lib/getClargs';
import { ArbTokenList } from './lib/types';
import { writeToFile, getPath } from './lib/store';
import { ETHERSCAN_LIST_NAME } from './lib/constants';
import { ArgvLike } from './lib/getClargs';

export const start = async (argvInput?: ArgvLike) => {
  let argMap;
  if(typeof argvInput !== 'undefined') {
    argMap = argvInput
  } else {
    if(typeof args.action === 'undefined' || typeof args.tokenList === 'undefined'  || typeof args.l2NetworkID === 'undefined' ) {
      throw new Error("You must set --action, --tokenList and --l2NetworkID");
    }
    argMap = args
  }

  if (argMap.action === 'full') {
    if (argMap.tokenList !== 'full')
      throw new Error("expected --tokenList 'full'");
    if (argMap.includePermitTags)
      throw new Error('full list mode does not support permit tagging');

    return writeToFile(
      await generateFullList(argMap.skipValidation ?? true), 
      getPath(ETHERSCAN_LIST_NAME)
    );
  }

  let tokenList: ArbTokenList;
  let path: string;
  const includeOldDataFields: boolean =  !! argMap.includeOldDataFields;

  if (argMap.action === 'arbify') {
    const { newList, l1ListName } = await arbifyL1List(
      argMap.tokenList!,
      includeOldDataFields,
      argMap.skipValidation ?? true
    );
    tokenList = newList;
    path = getPath(l1ListName);
  } else if (argMap.action === 'update') {
    const { newList, path: _path } = await updateArbifiedList(
      argMap.tokenList!,
      includeOldDataFields,
      argMap.skipValidation ?? true
    );
    tokenList = newList;
    path = _path;
  } else if (argMap.action === 'alltokenslist') {
    tokenList = await generateFullListFormatted(argMap.skipValidation ?? true);
    path = getPath('full');
  } else {
    throw new Error(`action ${argMap.action} not recognised`);
  }

  if (argMap.includePermitTags) tokenList = await addPermitTags(tokenList);
  writeToFile(tokenList, path);
};
