import { generateFullList } from '../lib/token_list_gen';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';

export const command = Action.Full;

export const describe = 'Full';

export const handler = async ({
  includePermitTags,
  l2NetworkID,
  newArbifiedList,
  tokenList: tokenListPath,
}: Args) => {
  if (tokenListPath !== 'full') throw new Error("expected --tokenList 'full'");
  if (includePermitTags)
    throw new Error('full list mode does not support permit tagging');
  if (!l2NetworkID) {
    throw new Error('l2NetworkID is required');
  }
  const tokenList = await generateFullList(l2NetworkID);
  writeToFile(tokenList, newArbifiedList);
  return tokenList;
};
