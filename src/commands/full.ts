import { generateFullList } from '../lib/token_list_gen';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';

export const command = Action.Full;

export const describe = 'Full';

export const handler = async (argvs: Args) => {
  if (argvs.tokenList !== 'full')
    throw new Error("expected --tokenList 'full'");
  if (argvs.includePermitTags)
    throw new Error('full list mode does not support permit tagging');
  const tokenList = await generateFullList();
  writeToFile(tokenList, argvs.newArbifiedList);
  return tokenList;
};
