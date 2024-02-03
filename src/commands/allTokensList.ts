import { ArbTokenList } from '../lib/types';
import { generateFullListFormatted } from '../lib/token_list_gen';
import { addPermitTags } from '../PermitTokens/permitSignature';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';

export const command = Action.AllTokensList;

export const describe = 'All tokens list';

export const handler = async (argvs: Args) => {
  let tokenList: ArbTokenList = await generateFullListFormatted(
    argvs.l2NetworkID,
  );
  if (argvs.includePermitTags) {
    tokenList = await addPermitTags(tokenList, argvs.l2NetworkID);
  }
  writeToFile(tokenList, argvs.newArbifiedList);
  return tokenList;
};
