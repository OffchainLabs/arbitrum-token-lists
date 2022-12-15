import {
  ArbTokenList,
  addPermitTags,
  arbifyL1List,
  generateFullList,
  updateArbifiedList,
  writeToFile,
} from 'sdk';

import args from './getClargs';

const main = async () => {
  const {
    action,
    includeOldDataFields,
    includePermitTags,
    l2NetworkID,
    tokenList: fullTokenList,
  } = args;

  if (action === 'full') {
    if (fullTokenList !== 'full')
      throw new Error("expected --tokenList 'full'");
    if (includePermitTags)
      throw new Error('full list mode does not support permit tagging');

    return writeToFile(await generateFullList(l2NetworkID), l2NetworkID);
  }

  let tokenList: ArbTokenList;

  switch (action) {
    case 'arbify':
      tokenList = await arbifyL1List(
        fullTokenList,
        l2NetworkID,
        !!includeOldDataFields
      );
      break;
    case 'update':
      tokenList = await updateArbifiedList(fullTokenList, l2NetworkID);
      break;
    default:
      throw new Error(`action ${action} not recognised`);
  }

  if (includePermitTags)
    tokenList = await addPermitTags(tokenList, l2NetworkID);

  writeToFile(tokenList, l2NetworkID);
};

main()
  .then(() => console.log('Done.'))
  .catch(err => {
    console.error(err);
    throw err;
  });
