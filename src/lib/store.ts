import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { ArbTokenList, EtherscanList } from './types';
import { isArbTokenList } from './utils';

export const getPrevList = (
  arbifiedList: string | null,
): ArbTokenList | undefined => {
  const path = arbifiedList ?? '';
  if (!existsSync(path)) {
    console.log("Doesn't exist an arbified list.");
    return undefined;
  }

  const data = readFileSync(path);
  console.log('Prev version of Arb List found');

  const prevArbTokenList = JSON.parse(data.toString());
  isArbTokenList(prevArbTokenList);
  return prevArbTokenList as ArbTokenList;
};

export const writeToFile = (
  list: ArbTokenList | EtherscanList,
  path: string,
) => {
  const fileTypeArr = path.split('.');
  const fileType = fileTypeArr[fileTypeArr.length - 1];

  const dirPath = path.substring(0, path.lastIndexOf('/'));

  if (fileType !== 'json') {
    throw new Error('The --newArbifiedList file should be json type.');
  }

  if (!existsSync(dirPath)) {
    console.log(`Setting up token list dir at ${dirPath}`);
    mkdirSync(dirPath, {
      recursive: true,
    });
  }

  writeFileSync(path, JSON.stringify(list));
  console.log('Token list generated at', path);
};
