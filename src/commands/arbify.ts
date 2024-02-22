import { ArbTokenList } from '../lib/types';
import { addPermitTags } from '../PermitTokens/permitSignature';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';
import { arbifyL1List } from '../lib/token_list_gen';
import { getTokenListObj, removeInvalidTokensFromList } from '../lib/utils';

export const command = Action.Arbify;

export const describe = 'Arbify';

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

  const l1TokenList = await getTokenListObj(tokenListPath);
  removeInvalidTokensFromList(l1TokenList);
  const newList = await arbifyL1List(tokenListPath, l1TokenList, l2NetworkID, {
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
