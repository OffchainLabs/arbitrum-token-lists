import { ArbTokenList } from '../lib/types';
import { generateFullListFormatted } from '../lib/token_list_gen';
import { addPermitTags } from '../PermitTokens/permitSignature';
import { writeToFile, getPath } from '../lib/store';
import { Action, Args } from '../lib/options';

export const command = Action.AllTokensList;

export const describe = 'All tokens list';

export const handler = async (argvs: Args) => {
  let tokenList: ArbTokenList = await generateFullListFormatted();
  const path = getPath('full');

  if (argvs.includePermitTags) tokenList = await addPermitTags(tokenList);
  writeToFile(tokenList, path);
  return tokenList;
};
