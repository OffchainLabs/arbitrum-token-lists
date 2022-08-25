import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { ETHERSCAN_LIST_NAME } from "./constants";
import { ArbTokenList, EtherscanList } from "./types";
import { isArbTokenList, isNova } from "./utils";

export const listNameToFileName = (name: string) => {
    const prefix = 'arbed_';
    let fileName = name.split(' ').join('_').toLowerCase() + '.json';
    if (!fileName.startsWith(prefix)) {
      fileName = prefix + fileName;
    }
    return fileName;
};

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
    const TOKENLIST_DIR_PATH = __dirname + '/ArbTokenLists';
    const FULLLIST_DIR_PATH = __dirname + '/FullList';

    if (!existsSync(TOKENLIST_DIR_PATH)) {
        console.log(`Setting up token list dir at ${TOKENLIST_DIR_PATH}`);
        mkdirSync(TOKENLIST_DIR_PATH);
    }
    
    if (!existsSync(FULLLIST_DIR_PATH)) {
        console.log(`Setting up full list dir at ${FULLLIST_DIR_PATH}`);
        mkdirSync(FULLLIST_DIR_PATH);
    }

    const path = getPath('name' in list ? list.name : ETHERSCAN_LIST_NAME)
    writeFileSync(path, JSON.stringify(list));
    console.log('Token list generated at', path);
}
