import { ArbTokenList } from '../lib/types';
import { updateArbifiedList } from '../lib/token_list_gen';
import { addPermitTags } from '../PermitTokens/permitSignature';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';

export const command = Action.Update;

export const describe = 'Update';

export const handler = async (argvs: Args) => {
  const includeOldDataFields = !!argvs.includeOldDataFields;
  const { newList, path } = await updateArbifiedList(argvs.tokenList, {
    includeOldDataFields,
    ignorePreviousList: argvs.ignorePreviousList,
    newArbifiedList: argvs.newArbifiedList,
  });
  let tokenList: ArbTokenList = newList;

  if (argvs.includePermitTags) tokenList = await addPermitTags(tokenList);
  writeToFile(tokenList, path);
  return tokenList;
};
