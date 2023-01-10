import { generateFullList } from '../lib/token_list_gen';
import { writeToFile, getPath } from '../lib/store';
import { Action, Args } from '../lib/options';
import { ETHERSCAN_LIST_NAME } from '../lib/constants';

export const command = Action.Full;

export const describe = 'Full';

export const builder = () => {};

export const handler = async (argvs: Args) => {
  if (argvs.tokenList !== 'full')
    throw new Error("expected --tokenList 'full'");
  if (argvs.includePermitTags)
    throw new Error('full list mode does not support permit tagging');

  const tokenList = await generateFullList();
  writeToFile(tokenList, getPath(ETHERSCAN_LIST_NAME));
  return tokenList;
};
