import Ajv from "ajv";
import addFormats from "ajv-formats";
import { schema, TokenList } from "@uniswap/token-lists";
import { writeFileSync, readFileSync, existsSync } from "fs";
import axios from "axios";
import {
  Bridge,
  L1GatewayRouter__factory,
  ERC20__factory,
  L2ERC20Gateway__factory,
  BridgeHelper
} from "arb-ts";
import { utils, providers } from "ethers";
import { GraphTokenResult, ArbTokenList } from './types'

const routerIface = L1GatewayRouter__factory.createInterface();
const tokenIface = ERC20__factory.createInterface();

const coinGeckoBuff = readFileSync('./src/Assets/coingecko_uris.json');
const logoURIsBuff = readFileSync('./src/Assets/logo_uris.json');

const coingeckoURIs = JSON.parse(coinGeckoBuff.toString());
const logoUris = JSON.parse(logoURIsBuff.toString());
for (let address of Object.keys(logoUris)) {
  logoUris[address.toLowerCase()] = logoUris[address];
}

export const listNameToFileName = (name: string) => {
  const prefix = "arbed_"
  let fileName = name.split(' ').join('_').toLowerCase() + '.json';
  if(!fileName.startsWith(prefix)){
    fileName =  prefix + fileName
  }
  return fileName
};

export const listNameToArbifiedListName = (name: string)=>{
  const prefix = "Arbed "

  let fileName = sanitizeString(name)
  if(!fileName.startsWith(prefix)){
    fileName =  prefix + fileName
  }
  return fileName.split(' ').slice(0,2).join(' ').slice(0,20)
}

export const getL2TokenAddresses = async (
  l1TokenAddresses: string[],
  bridge: Bridge
) => {
  const { network: l1Network } = bridge.l1Bridge;

  const calls = l1TokenAddresses.map((l1TokenAddress: string) => {
    return {
      target: l1Network.tokenBridge.l1GatewayRouter,
      funcFragment: routerIface.functions['calculateL2TokenAddress(address)'],
      values: [l1TokenAddress],
    };
  });
  const l2Addresses = await bridge.l1Bridge.getMulticallAggregate(calls);
  const _l2Addresses = l2Addresses.map((m, i) => {
    const x = l2Addresses && l2Addresses[i] && l2Addresses[i];
    return (x && (x[0] as string)) || '';
  });

  return _l2Addresses;
};

export const getL2TokenData = async (
  l2TokenAddresses: string[],
  bridge: Bridge
) => {
  const l2Calls = l2TokenAddresses
    .map((l2Address) => {
      return [
        {
          target: l2Address,
          funcFragment: tokenIface.functions['symbol()'],
        },
        {
          target: l2Address,
          funcFragment: tokenIface.functions['decimals()'],
        },
        {
          target: l2Address,
          funcFragment: tokenIface.functions['name()'],
        },
      ];
    })
    .flat();
  const l2Data = await bridge.l2Bridge.getMulticallAggregate(l2Calls);
  const tokenData: {
    symbol: string;
    decimals: number;
    name: string;
  }[] = [];

  // unflatten
  for (let i = 0; i < l2Data.length; i += 3) {
    const first = l2Data[i];
    const second = l2Data[i + 1];
    const third = l2Data[i + 2];

    let symbol = (first && (first[0] as string)) || '';
    if (symbol.length === 64) {
      symbol = utils.parseBytes32String('0x' + symbol);
    }
    const decimals = (second && (second[0] as number)) || 0;

    let name = (third && (third[0] as string)) || '';

    if (name.length === 64) {
      name = utils.parseBytes32String('0x' + name);
    }

    tokenData.push({
      symbol,
      decimals,
      name,
    });
  }
  return tokenData;
};

export const getLogoUri = async (l1TokenAddress: string) => {
  const l1TokenAddressLCase = l1TokenAddress.toLowerCase();
  const logoUri: string | undefined = logoUris[l1TokenAddressLCase];
  const coinGeckoURI: string | undefined = coingeckoURIs[l1TokenAddressLCase];
  const trustWalletUri = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${l1TokenAddress}/logo.png`;
  const uris = [logoUri, coinGeckoURI, trustWalletUri].filter(
    (x): x is string => !!x
  );

  for (const uri of uris) {
    try {
      const res = await axios.get(uri);
      if (res.status === 200) {
        return uri;
      }
    } catch (e) {}
  }
  return;
};
export const getTokenListObjFromUrl = async (url: string) => {
  return (await axios.get(url)).data as TokenList;
};
export const getTokenListObjFromLocalPath = async (path: string) => {
  return JSON.parse(readFileSync(path).toString()) as TokenList;
};

export const validateTokenList = (tokenList: ArbTokenList | TokenList) => {
  const ajv = new Ajv();
  addFormats(ajv);
  const validate = ajv.compile(schema);

  return validate(tokenList);
};

export const validateTokenListWithErrorThrowing = (tokenList: ArbTokenList | TokenList)=>{
  let valid = validateTokenList(tokenList);
  if (valid) {
    return true;
  } else {
    console.log("Invalid token list:");
    while (!valid && tokenList.tokens.length > 0){
      const targetToken = tokenList.tokens.pop()
      valid = validateTokenList(tokenList);
      if(valid){
        console.log('Bad token:', targetToken);
        throw new Error('Invalid token list due to that token')
        
      }
    }
    throw new Error('Data does not confirm to token list schema; not sure why');
  }
}

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

  validateTokenListWithErrorThrowing(tokenList);
  return tokenList;
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

export const sanitizeString = (str:string)=> str.replace(/[^ \w.'+\-%/À-ÖØ-öø-ÿ:&\[\]\(\)]/gi, '');

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


