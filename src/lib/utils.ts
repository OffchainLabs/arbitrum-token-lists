import { TokenList } from '@uniswap/token-lists';
import { readFileSync, existsSync } from 'fs';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { ArbitrumNetwork, MultiCaller } from '@arbitrum/sdk';
import { L1GatewayRouter__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L1GatewayRouter__factory';
import { L2GatewayRouter__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L2GatewayRouter__factory';

import { ArbTokenList, GraphTokenResult } from './types';
import path from 'path';
import { tokenListIsValid } from './validateTokenList';
import {
  l2ToL1GatewayAddresses,
  l2ToL1GatewayAddressesNova,
} from './constants';
import { getArgvs } from './options';

// On failed request, retry with exponential back-off
axiosRetry(axios, {
  retries: 5,
  retryCondition: () => true,
  retryDelay: (retryCount) => 65_000 + retryCount * 10_000, // (milliseconds)
  onRetry(retryCount, error) {
    console.log(
      `Request failed with ${error.code}. Retrying ${retryCount} times.`,
    );
  },
});

export const isNetwork = () => {
  const argv = getArgvs();
  return {
    isArbOne: argv.l2NetworkID === 42161,
    isNova: argv.l2NetworkID === 42170,
    isSepoliaRollup: argv.l2NetworkID === 421614,
  };
};

const coinGeckoBuff = readFileSync(
  path.resolve(__dirname, '../Assets/coingecko_uris.json'),
);
const logoURIsBuff = readFileSync(
  path.resolve(__dirname, '../Assets/logo_uris.json'),
);

const coingeckoURIs = JSON.parse(coinGeckoBuff.toString());
const logoUris = JSON.parse(logoURIsBuff.toString());
for (const address of Object.keys(logoUris)) {
  logoUris[address.toLowerCase()] = logoUris[address];
}

export const listNameToArbifiedListName = (
  name: string,
  childChainId: number,
) => {
  const prefix = 'Arbed ';

  let fileName = sanitizeNameString(name);
  if (!fileName.startsWith(prefix)) {
    fileName = prefix + fileName;
  }

  const baseName = fileName.split(' ').slice(0, 3).join(' ').slice(0, 20);
  return `${baseName} ${childChainId}`;
};

export const getL1TokenAndL2Gateway = async (
  tokenList: { addr: string; logo: string | undefined }[],
  l2Multicaller: MultiCaller,
  l2Network: ArbitrumNetwork,
): Promise<Array<GraphTokenResult>> => {
  const routerData = await getL2GatewayAddressesFromL1Token(
    tokenList.map((curr) => curr.addr),
    l2Multicaller,
    l2Network,
  );

  return tokenList.map((curr, i) => ({
    joinTableEntry: [
      {
        gateway: {
          gatewayAddr: routerData[i],
        },
      },
    ],
    l1TokenAddr: curr.addr,
  }));
};
export const promiseErrorMultiplier = <T>(
  prom: Promise<T>,
  handler: (err: Error) => Promise<T>,
  tries = 3,
  verbose = false,
) => {
  let counter = 0;
  while (counter < tries) {
    prom = prom.catch((err) => handler(err));
    counter++;
  }
  return prom.catch((err) => {
    if (verbose) console.error('Failed ' + tries + ' times. Giving up');
    throw err;
  });
};

export const getL1GatewayAddress = (l2GatewayAddress: string) => {
  const { isNova } = isNetwork();
  const l2Gateway = isNova
    ? l2ToL1GatewayAddressesNova[l2GatewayAddress.toLowerCase()]
    : l2ToL1GatewayAddresses[l2GatewayAddress.toLowerCase()];

  if (l2Gateway) return l2Gateway;

  return undefined;
};

export const getL2GatewayAddressesFromL1Token = async (
  l1TokenAddresses: string[],
  l2Multicaller: MultiCaller,
  l2Network: ArbitrumNetwork,
): Promise<string[]> => {
  const iFace = L1GatewayRouter__factory.createInterface();

  const INC = 500;
  let index = 0;
  console.info(
    'getL2GatewayAddressesFromL1Token for',
    l1TokenAddresses.length,
    'tokens',
  );

  let gateways: (string | undefined)[] = [];

  while (index < l1TokenAddresses.length) {
    console.log(
      'Getting tokens',
      index,
      'through',
      Math.min(index + INC, l1TokenAddresses.length),
    );

    const l1TokenAddressesSlice = l1TokenAddresses.slice(index, index + INC);

    const tokenBridge = l2Network.tokenBridge;
    if (!tokenBridge) {
      throw new Error('Child network is missing tokenBridge');
    }

    const result = await l2Multicaller.multiCall(
      l1TokenAddressesSlice.map((addr) => ({
        encoder: () => iFace.encodeFunctionData('getGateway', [addr]),
        decoder: (returnData: string) =>
          iFace.decodeFunctionResult('getGateway', returnData)[0] as string,
        targetAddr: tokenBridge.childGatewayRouter,
      })),
    );
    gateways = gateways.concat(result);
    index += INC;
  }

  for (const curr of gateways) {
    if (typeof curr === 'undefined') throw new Error('undefined gateway!');
  }

  return gateways as string[];
};

export const getL2TokenAddressesFromL1 = async (
  l1TokenAddresses: string[],
  multiCaller: MultiCaller,
  l1GatewayRouterAddress: string,
) => {
  const iFace = L1GatewayRouter__factory.createInterface();

  const l1TokenAddressesLowercased = l1TokenAddresses.map((address) =>
    address.toLowerCase(),
  );

  return await multiCaller.multiCall(
    l1TokenAddressesLowercased.map((addr) => ({
      encoder: () =>
        iFace.encodeFunctionData('calculateL2TokenAddress', [addr]),
      decoder: (returnData: string) =>
        iFace.decodeFunctionResult(
          'calculateL2TokenAddress',
          returnData,
        )[0] as string,
      targetAddr: l1GatewayRouterAddress,
    })),
  );
};

export const getL2TokenAddressesFromL2 = async (
  l1TokenAddresses: string[],
  multiCaller: MultiCaller,
  l2GatewayRouterAddress: string,
) => {
  const iFace = L2GatewayRouter__factory.createInterface();

  const l1TokenAddressesLowercased = l1TokenAddresses.map((address) =>
    address.toLowerCase(),
  );

  return await multiCaller.multiCall(
    l1TokenAddressesLowercased.map((addr) => ({
      encoder: () =>
        iFace.encodeFunctionData('calculateL2TokenAddress', [addr]),
      decoder: (returnData: string) =>
        iFace.decodeFunctionResult(
          'calculateL2TokenAddress',
          returnData,
        )[0] as string,
      targetAddr: l2GatewayRouterAddress,
    })),
  );
};

export const getLogoUri = async (l1TokenAddress: string) => {
  const l1TokenAddressLCase = l1TokenAddress.toLowerCase();
  const logoUri: string | undefined = logoUris[l1TokenAddressLCase];
  const coinGeckoURI: string | undefined = coingeckoURIs[l1TokenAddressLCase];
  const trustWalletUri = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${l1TokenAddress}/logo.png`;
  const uris = [logoUri, coinGeckoURI, trustWalletUri].filter(
    (x): x is string => !!x,
  );

  for (const uri of uris) {
    try {
      const res = await axios.get(uri);
      if (res.status === 200) {
        return uri;
      }
    } catch (e) {
      console.log(e);
    }
  }
  return;
};
export const getTokenListObjFromUrl = async (url: string) => {
  return (await axios.get(url)).data as TokenList;
};
export const getTokenListObjFromLocalPath = async (path: string) => {
  return JSON.parse(readFileSync(path).toString()) as TokenList;
};

export const removeInvalidTokensFromList = (
  tokenList: ArbTokenList | TokenList,
): ArbTokenList | TokenList => {
  // Quick check: if valid, return immediately
  if (tokenListIsValid(tokenList)) {
    return tokenList;
  }

  console.log('Invalid token list detected, filtering invalid tokens...');

  // Validate each token individually
  const validTokens = tokenList.tokens.filter((token) => {
    const singleTokenList = {
      ...tokenList,
      tokens: [token],
    };

    const isValid = tokenListIsValid(singleTokenList);

    if (!isValid) {
      console.log('Removing invalid token:', token.name || token.address);
    }

    return isValid;
  });

  const removedCount = tokenList.tokens.length - validTokens.length;
  console.log(`Removed ${removedCount} invalid token(s)`);

  // Create cleaned list
  const cleanedList = {
    ...tokenList,
    tokens: validTokens,
  };

  // Final validation to catch list-level issues (not token-level)
  if (!tokenListIsValid(cleanedList)) {
    throw new Error('Data does not confirm to token list schema; not sure why');
  }

  return cleanedList;
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
  isTokenList(tokenList);
  return tokenList;
};

// https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
export function isValidHttpUrl(urlString: string) {
  let url;

  try {
    url = new URL(urlString);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

export const getFormattedSourceURL = (sourceUrl?: string) => {
  if (!sourceUrl) return null;
  const urlReplaceForwardSlashes = sourceUrl.replace(/\//g, '__');
  return /^[ \w\.,:]+$/.test(urlReplaceForwardSlashes)
    ? urlReplaceForwardSlashes
    : null;
};
// typeguard:
export const isArbTokenList = (obj: any) => {
  const expectedListKeys = ['name', 'timestamp', 'version', 'tokens'];
  const actualListKeys = new Set(Object.keys(obj));
  if (!expectedListKeys.every((key) => actualListKeys.has(key))) {
    throw new Error(
      'ArbTokenList typeguard error: required list key not included',
    );
  }
  const { version, tokens } = obj;
  if (
    !['major', 'minor', 'patch'].every((key) => {
      return typeof version[key] === 'number';
    })
  ) {
    throw new Error('ArbTokenList typeguard error: invalid version');
  }
  if (
    !tokens.every((token: any) => {
      const tokenKeys = new Set(Object.keys(token));
      return ['chainId', 'address', 'name', 'decimals', 'symbol'].every(
        (key) => {
          return tokenKeys.has(key);
        },
      );
    })
  ) {
    throw new Error('ArbTokenList typeguard error: token missing required key');
  }
  tokens.forEach((token: any) => {
    if (token.extensions && token.extensions.bridgeInfo) {
      const {
        extensions: { bridgeInfo },
      } = token;
      const bridges = Object.keys(bridgeInfo);
      if (!bridges.length) {
        throw new Error('ArbTokenList typeguard error: no bridge info found');
      }
      const someDestinationChain = bridges[0];
      const { tokenAddress, originBridgeAddress, destBridgeAddress } =
        bridgeInfo[someDestinationChain];

      if (
        ![tokenAddress, originBridgeAddress, destBridgeAddress].every((k) => k)
      ) {
        throw new Error('ArbTokenList typeguard error: missing extension');
      }
    }
  });
};

// typeguard:
export const isTokenList = (obj: any) => {
  const expectedListKeys = ['name', 'timestamp', 'version', 'tokens'];
  const actualListKeys = new Set(Object.keys(obj));
  if (!expectedListKeys.every((key) => actualListKeys.has(key))) {
    throw new Error(
      'tokenlist typeguard error: required list key not included',
    );
  }
  const { version, tokens } = obj;
  if (
    !['major', 'minor', 'patch'].every((key) => {
      return typeof version[key] === 'number';
    })
  ) {
    throw new Error('tokenlist typeguard error: invalid version');
  }
  if (
    !tokens.every((token: any) => {
      const tokenKeys = new Set(Object.keys(token));
      return ['chainId', 'address', 'name', 'decimals', 'symbol'].every(
        (key) => {
          return tokenKeys.has(key);
        },
      );
    })
  ) {
    throw new Error('tokenlist typeguard error: token missing required key');
  }
};

export const sanitizeNameString = (str: string) =>
  str.replace('₮', 'T').replace(/[^ \w.'+\-%/À-ÖØ-öø-ÿ:&\[\]\(\)]/gi, '');

export const sanitizeSymbolString = (str: string) =>
  str.replace('₮', 'T').replace(/[^\w.'+\-%/À-ÖØ-öø-ÿ:&\[\]\(\)]/gi, '');

export function* getChunks<T>(arr: Array<T>, chunkSize = 500) {
  for (let i = 0; i < arr.length; i += chunkSize) {
    yield arr.slice(i, i + chunkSize);
  }
}

export const promiseRetrier = <T>(createProm: () => Promise<T>): Promise<T> =>
  promiseErrorMultiplier(createProm(), () => createProm());
