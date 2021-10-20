import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { schema, TokenList } from '@uniswap/token-lists';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import axios from 'axios';

export const getTokenListObjFromUrl = async (url: string) => {
  return (await axios.get(url)).data as TokenList;
};
export const getTokenListObjFromLocalPath = async (path: string) => {
  return JSON.parse(readFileSync(path).toString()) as TokenList;
};

export const getTokenListObj = async (pathOrUrl: string) => {
  const tokenList: TokenList = await (async (pathOrUrl: string) => {
    const localFileExists = existsSync(pathOrUrl);
    const looksLikeUrl = isValidHttpUrl(pathOrUrl);
    if (localFileExists) {
      return getTokenListObjFromLocalPath(pathOrUrl);
    } else if (looksLikeUrl) {
      return await getTokenListObjFromUrl(pathOrUrl);
    } else {
      throw new Error('Could not find token list');
    }
  })(pathOrUrl);

  const ajv = new Ajv();
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const valid = validate(tokenList);
  if (valid) {
    return tokenList;
  } else {
    console.log(tokenList);
    throw new Error('Data does not confirm to token list schema');
  }
};

// https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url

function isValidHttpUrl(urlString: string) {
  let url;

  try {
    url = new URL(urlString);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

export const excludeList = [
  '0x0CE51000d5244F1EAac0B313a792D5a5f96931BF',
  '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f',
  '0xEDA6eFE5556e134Ef52f2F858aa1e81c84CDA84b',
  '0xe54942077Df7b8EEf8D4e6bCe2f7B58B0082b0cd',
  '0x282db609e787a132391eb64820ba6129fceb2695',
  '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3',
  '0x106538cc16f938776c7c180186975bca23875287', // remove once bridged
].map((s) => s.toLowerCase());
