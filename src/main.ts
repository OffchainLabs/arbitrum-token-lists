import {
  arbifyL1List,
  updateArbifiedList,
  generateFullList,
  generateFullListFormatted,
} from './lib/token_list_gen';
import { addPermitTags } from './PermitTokens/permitSignature';
import args from './lib/getClargs';
import { ArbTokenList, EtherscanList } from './lib/types';
import { writeToFile, getPath } from './lib/store';
import { ETHERSCAN_LIST_NAME } from './lib/constants';

const main = async () => {
  if (args.action === 'full') {
    if (args.tokenList !== 'full')
      throw new Error("expected --tokenList 'full'");
    if (args.includePermitTags)
      throw new Error('full list mode does not support permit tagging');

    return writeToFile(await generateFullList(), getPath(ETHERSCAN_LIST_NAME));
  }

  let tokenList: ArbTokenList;
  let path: string;

  if (args.action === 'arbify') {
    const { newList, l1ListName } = await arbifyL1List(
      args.tokenList,
      !!args.includeOldDataFields
    );
    tokenList = newList;
    path = getPath(l1ListName);
  } else if (args.action === 'update') {
    const { newList, path: _path } = await updateArbifiedList(args.tokenList);
    tokenList = newList;
    path = _path;
  } else if (args.action === 'alltokenslist') {
    tokenList = await generateFullListFormatted();
    path = getPath('full');
  } else {
    throw new Error(`action ${args.action} not recognised`);
  }

  if (args.includePermitTags) tokenList = await addPermitTags(tokenList);
  writeToFile(tokenList, path);
};

main()
  .then(() => console.log('Done.'))
  .catch(err => {
    console.error(err);
    throw err;
  });
