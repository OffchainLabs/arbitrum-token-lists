import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { schema, TokenList } from '@uniswap/token-lists';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import axios from 'axios';
import { Bridge, L1GatewayRouter__factory, ERC20__factory } from 'arb-ts';
import { utils } from 'ethers';

const routerIface = L1GatewayRouter__factory.createInterface();
const tokenIface = ERC20__factory.createInterface();

export const listNameToFileName = (name: string) => {
  return 'arbified_' + name.split(' ').join('_').toLowerCase() + '.json';
};

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
    // @ts-ignore
    let symbol = (l2Data && l2Data[i] && (l2Data[i][0] as string)) || '';
    if (symbol.length === 64) {
      symbol = utils.parseBytes32String('0x' + symbol);
    }
    // @ts-ignore
    const decimals =
      (l2Data && l2Data[i + 1] && (l2Data[i + 1][0] as number)) || 0;
    // @ts-ignore
    let name = (l2Data && l2Data[i + 2] && (l2Data[i + 2][0] as string)) || '';
    if (name.length === 64) {
      name = utils.parseBytes32String('0x' + name);
    }

    // @ts-ignore
    tokenData.push({
      symbol,
      decimals,
      name,
    });
  }
  return tokenData;
};

export const getZapperURIs = async () => {
  return (
    (await axios.get('https://zapper.fi/api/token-list')) as any
  ).data.tokens.reduce((acc: any, currentToken: any) => {
    return {
      ...acc,
      [currentToken.address.toLocaleLowerCase()]: currentToken.logoURI,
    };
  }, {});
};

export const getLogoUri = async (
  l1TokenAddress: string,
  zapperLogoUris: any
) => {
  const l1TokenAddressLCase = l1TokenAddress.toLowerCase();
  const zapperUri = zapperLogoUris[l1TokenAddressLCase];

  if (zapperUri) {
    try {
      const res = await axios.get(zapperUri);
      if (res.status === 200) {
        return zapperUri;
      }
    } catch (e) {
      // zapper uri not found
    }
  }
  const trustWalletUri = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${l1TokenAddress}/logo.png`;

  try {
    const res = await axios.get(trustWalletUri);
    if (res.status === 200) {
      return trustWalletUri;
    }
  } catch (e) {
    // trustwallet uri not found
  }
  console.log('Could not get icon for', l1TokenAddress);

  return;
};
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
  '0x0CE51000d5244F1EAac0B313a792D5a5f96931BF', //rkr
  '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f', //in
  '0xEDA6eFE5556e134Ef52f2F858aa1e81c84CDA84b', // bad cap
  '0xe54942077Df7b8EEf8D4e6bCe2f7B58B0082b0cd', // swapr
  '0x282db609e787a132391eb64820ba6129fceb2695', // amy
  '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', // mim
  '0x106538cc16f938776c7c180186975bca23875287', // remove once bridged (basv2)
  '0xB4A3B0Faf0Ab53df58001804DdA5Bfc6a3D59008', // spera
].map((s) => s.toLowerCase());
