import {
  arbifyL1List,
  updateArbifiedList,
  permitList,
  generateFullList,
} from './lib/token_list_gen';
import args from './lib/getClargs';
import { ArbTokenList, EtherscanList } from './lib/types';
import { writeToFile } from './lib/store';


const main = async () => {
  let tokenList: ArbTokenList | EtherscanList;

  if (args.action === 'arbify') {
    tokenList = await arbifyL1List(
      args.tokenList,
      !!args.includeOldDataFields
    );
  } else if (args.action === 'update') {

    tokenList = await updateArbifiedList(args.tokenList);

  } else if (args.action === 'full') {
    if (args.tokenList !== 'full')
      throw new Error("expected --tokenList 'full'");
    
      tokenList = await generateFullList()
  } else if (args.action === 'permit') {
    if (!args.tokenList) throw new Error('No token list provided');

    tokenList = await permitList(args.tokenList);
  } else {
    throw new Error(`action ${args.action} not recognised`);
  }

  writeToFile(tokenList)
};

main()
  .then(() => console.log("Done."))
  .catch((err) => {
    console.error(err)
    throw err
  });
