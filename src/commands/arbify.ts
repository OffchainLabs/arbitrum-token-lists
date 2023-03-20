import { ArbTokenList } from '../lib/types';
import { addPermitTags } from '../PermitTokens/permitSignature';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';
import { arbifyL1List } from '../lib/token_list_gen';

export const command = Action.Arbify;

export const describe = 'Arbify';

export const handler = async (argvs: Args) => {
  const includeOldDataFields = !!argvs.includeOldDataFields;

  const { newList } = await arbifyL1List(argvs.tokenList, {
    includeOldDataFields,
    ignorePreviousList: argvs.ignorePreviousList,
    prevArbifiedList: argvs.prevArbifiedList,
  });
  let tokenList: ArbTokenList = newList;

  if (argvs.includePermitTags) tokenList = await addPermitTags(tokenList);
  writeToFile(tokenList, argvs.newArbifiedList);
  return tokenList;
};
