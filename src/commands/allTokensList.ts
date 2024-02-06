import { ArbTokenList } from '../lib/types';
import { generateFullListFormatted } from '../lib/token_list_gen';
import { addPermitTags } from '../PermitTokens/permitSignature';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';

export const command = Action.AllTokensList;

export const describe = 'All tokens list';

export const handler = async ({
  includePermitTags,
  l2NetworkID,
  newArbifiedList,
}: Args) => {
  if (!l2NetworkID) {
    throw new Error('l2NetworkID is required');
  }
  let tokenList: ArbTokenList = await generateFullListFormatted(l2NetworkID);
  if (includePermitTags) {
    tokenList = await addPermitTags(tokenList, l2NetworkID);
  }
  writeToFile(tokenList, newArbifiedList);
  return tokenList;
};
