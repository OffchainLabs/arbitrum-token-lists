import { writeFileSync, readFileSync, existsSync } from "fs";
import { ArbTokenList, EtherscanList } from "./types";
import { isArbTokenList, isNova, sanitizeNameString } from "./utils";

export const listNameToFileName = (name: string) => {
    const prefix = 'arbed_';
    let fileName = name.split(' ').join('_').toLowerCase() + '.json';
    if (!fileName.startsWith(prefix)) {
      fileName = prefix + fileName;
    }
    return fileName;
};

export const ETHERSCAN_LIST_NAME = "EtherscanList"

const getPath = (l1ListName: string) => {
    if(l1ListName === ETHERSCAN_LIST_NAME) return __dirname + '/FullList/all_tokens.json';
    let path = '';
    if (isNova) {
      path =
        process.env.PWD +
        '/src/ArbTokenLists/42170_' +
        listNameToFileName(l1ListName);
    } else {
      path =
        process.env.PWD +
        '/src/ArbTokenLists/' +
        listNameToFileName(l1ListName);
    }
    return path
}

export const getPrevList = (
  l1ListName: string
): ArbTokenList | undefined => {
  const path = getPath(l1ListName);
  if (existsSync(path)) {
    const data = readFileSync(path);
    console.log("Prev version of Arb List found");

    const prevArbTokenList = JSON.parse(data.toString());
    isArbTokenList(prevArbTokenList);
    return prevArbTokenList as ArbTokenList;
  }
  return undefined;
};

export const writeToFile = (list: ArbTokenList | EtherscanList) => { 
    const path = getPath('name' in list ? list.name : ETHERSCAN_LIST_NAME)
    writeFileSync(path, JSON.stringify(list));
    console.log('Token list generated at', path);
}
