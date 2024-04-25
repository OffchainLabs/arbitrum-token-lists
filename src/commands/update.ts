import { ArbTokenList } from '../lib/types';
import { updateArbifiedList } from '../lib/token_list_gen';
import { addPermitTags } from '../PermitTokens/permitSignature';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';

export const command = Action.Update;

export const describe = 'Update';

export const handler = async ({
  ignorePreviousList,
  includeOldDataFields,
  includePermitTags,
  l2NetworkID,
  newArbifiedList,
  prevArbifiedList,
  tokenList: tokenListPath,
}: Args) => {
  if (!l2NetworkID) {
    throw new Error('l2NetworkID is required');
  }
  const { newList } = await updateArbifiedList(tokenListPath, l2NetworkID, {
    includeOldDataFields: !!includeOldDataFields,
    ignorePreviousList,
    prevArbifiedList,
  });
  let tokenList: ArbTokenList = newList;

  if (includePermitTags) {
    tokenList = await addPermitTags(tokenList, l2NetworkID);
  }
  writeToFile(tokenList, newArbifiedList);
  return tokenList;
};
