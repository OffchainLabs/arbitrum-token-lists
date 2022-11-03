export interface L2ToL1GatewayAddresses {
  [contractAddress: string]: string;
}

const objKeyAndValToLowerCase = (obj: { [key: string]: string }) =>
  Object.keys(obj).reduce((acc: { [key: string]: string }, key) => {
    acc[key.toLowerCase()] = obj[key].toLowerCase();
    return acc;
  }, {});


export const excludeList = [
  '0x0CE51000d5244F1EAac0B313a792D5a5f96931BF', //rkr
  '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f', //in
  '0xEDA6eFE5556e134Ef52f2F858aa1e81c84CDA84b', // bad cap
  '0xe54942077Df7b8EEf8D4e6bCe2f7B58B0082b0cd', // swapr
  '0x282db609e787a132391eb64820ba6129fceb2695', // amy
  '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', // mim
  '0x106538cc16f938776c7c180186975bca23875287', // remove once bridged (basv2)
  '0xB4A3B0Faf0Ab53df58001804DdA5Bfc6a3D59008', // spera
  // "0x960b236a07cf122663c4303350609a66a7b288c0", //aragon old
].map((s) => s.toLowerCase());

export const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

export const ETHERSCAN_LIST_NAME = 'EtherscanList';

export const ETHERSCAN_PATH = process.env.PWD + '/src/FullList/all_tokens.json';
export const ALL_TOKENS_GOERLI_ROLLUP_PATH =
  process.env.PWD + '/src/FullList/421613_all_tokens.json';
export const TOKENLIST_DIR_PATH = process.env.PWD + '/src/ArbTokenLists';
export const FULLLIST_DIR_PATH = process.env.PWD + '/src/FullList';
