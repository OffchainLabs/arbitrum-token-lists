import { TokenList } from '@uniswap/token-lists';
import { readFileSync, existsSync } from 'fs';
import axios from 'axios';
import { ethers } from 'ethers';
import { CallInput, L2Network, MultiCaller } from '@arbitrum/sdk';
import { L1GatewayRouter__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L1GatewayRouter__factory';
import { L2GatewayRouter__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L2GatewayRouter__factory';
import { TokenGateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TokenGateway__factory';
import { getGatewaysets } from './graph';
import { ArbTokenList, GraphTokenResult } from './types';
import path from 'path';
import { exit } from 'process';
import { Provider } from '@ethersproject/providers';
import { tokenListIsValid } from './validateTokenList';
import { getArgvs } from './options';

export const isNetwork = () => {
  const argv = getArgvs();
  return {
    isArbOne: argv.l2NetworkID === 42161,
    isNova: argv.l2NetworkID === 42170,
    isGoerliRollup: argv.l2NetworkID === 421613,
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

export const listNameToArbifiedListName = (name: string) => {
  const prefix = 'Arbed ';

  let fileName = sanitizeNameString(name);
  if (!fileName.startsWith(prefix)) {
    fileName = prefix + fileName;
  }
  return fileName.split(' ').slice(0, 2).join(' ').slice(0, 20);
};

export const getL1TokenAndL2Gateway = async (
  tokenList: { addr: string; logo: string | undefined }[],
  l2Multicaller: MultiCaller,
  l2Network: L2Network,
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

export const generateGatewayMap = async (
  l2Multicaller: MultiCaller,
  l2Network: L2Network,
  l1Provider: Provider,
) => {
  const l1GatewayResults: Map<string, string> = new Map();
  const l1Token: any[] = [];
  const gatewayMap: Map<string, string> = new Map();

  //default gateway can be set during initialize call, it does not emit GatewaySet, so we should
  //manually set it
  {
    const l1GatewayRouter = L1GatewayRouter__factory.connect(
      l2Network.tokenBridge.l1GatewayRouter,
      l1Provider,
    );
    const defaultGateway = await l1GatewayRouter.defaultGateway();
    const defaultGatewayContract = new ethers.Contract(
      defaultGateway,
      TokenGateway__factory.abi,
    ).connect(l1Provider);
    const defaultCounterPartGateway =
      await defaultGatewayContract.counterpartGateway();
    gatewayMap.set(
      defaultCounterPartGateway.toLowerCase(),
      defaultGateway.toLowerCase(),
    );
  }

  const gatewaySetsList = await getGatewaysets();
  for (let i = 0; i < gatewaySetsList.length; i++) {
    const tokenAddress = gatewaySetsList[i].l1Token;
    let l1GatewayAddress = gatewaySetsList[i].gateway;

    // This token on goerli doesn't set correctly, so we should ignore it.
    if (
      tokenAddress == '0x208d48e7eb3f316214c28894b3a6aea9e87c59a5' &&
      l2Network.chainID == 421613
    ) {
      console.log(gatewaySetsList[i]);
      continue;
    }

    //if gateway set to zero, which means it sets back to standard erc20 gateway
    if (l1GatewayAddress === ethers.constants.AddressZero) {
      l1GatewayAddress = l2Network.tokenBridge.l1ERC20Gateway;
    }
    l1GatewayResults.set(tokenAddress, l1GatewayAddress);
    l1Token.push(tokenAddress);
  }

  const l2GatewayMaps = await getL2GatewayAddressesFromL1Token(
    l1Token,
    l2Multicaller,
    l2Network,
  );

  //set gateway map
  for (let i = 0; i < l1Token.length; i++) {
    if (l2GatewayMaps[i] === ethers.constants.AddressZero) continue;
    gatewayMap.set(
      l2GatewayMaps[i].toLowerCase(),
      l1GatewayResults.get(l1Token[i])!.toLowerCase(),
    );
  }

  //edge case: gateway registered on l1 while not on l2
  if (!(await checkMapResultByL2Gateway(gatewayMap, l2Multicaller))) {
    exit(1);
  }

  console.log('Successfully generate gateway map');
  return gatewayMap;
};

export const getL1GatewayAddress = async (
  l2GatewayAddress: string,
  l2ToL1GatewayAddresses: Map<string, string>,
) => {
  return l2ToL1GatewayAddresses.get(l2GatewayAddress.toLowerCase());
};

export const checkMapResultByL2Gateway = async (
  l2ToL1GatewayAddresses: Map<string, string>,
  l2Multicaller: MultiCaller,
) => {
  const keys = l2ToL1GatewayAddresses.keys();
  const l2Gateways: string[] = [...keys];
  const l1Gateways = await getL1GatewayFromL2Gateway(l2Gateways, l2Multicaller);
  for (let i = 0; i < l2Gateways.length; i++) {
    if (
      l2ToL1GatewayAddresses.get(l2Gateways[i]) !== l1Gateways[i].toLowerCase()
    ) {
      console.log(
        `Gateway map check invalid, invalid l2 gateway address is ` +
          `${l2Gateways[i]}, invalid l1 gateway address is ${l1Gateways[i]}`,
      );
      return false;
    }
  }
  return true;
};

// Since l2 grt gateway has different interface, we should change the call id
const getCallInput = (
  addr: string,
  standardiFace: ethers.utils.Interface,
): CallInput<string> => {
  // The graph token (grt) doesn't use our standard interface, we should handle it as this:
  if (
    addr === '0x65e1a5e8946e7e87d9774f5288f41c30a99fd302' ||
    addr === `0xef2757855d2802ba53733901f90c91645973f743`
  ) {
    const iFace = new ethers.utils.Interface([
      'function l1Counterpart() view returns (address)',
    ]);
    return {
      encoder: () => iFace.encodeFunctionData('l1Counterpart'),
      decoder: (returnData: string) =>
        iFace.decodeFunctionResult('l1Counterpart', returnData)[0] as string,
      targetAddr: addr,
    };
  }
  return {
    encoder: () => standardiFace.encodeFunctionData('counterpartGateway'),
    decoder: (returnData: string) =>
      standardiFace.decodeFunctionResult(
        'counterpartGateway',
        returnData,
      )[0] as string,
    targetAddr: addr,
  };
};

export const getL1GatewayFromL2Gateway = async (
  l2Gateways: string[],
  l2Multicaller: MultiCaller,
): Promise<string[]> => {
  const iFace = L2GatewayRouter__factory.createInterface();

  const INC = 500;
  let index = 0;
  console.info(
    'getL1GatewayFromL2Gateway for',
    l2Gateways.length,
    'l2 Gateways',
  );

  let l1Gateways: (string | undefined)[] = [];

  while (index < l2Gateways.length) {
    console.log(
      'Getting tokens',
      index,
      'through',
      Math.min(index + INC, l2Gateways.length),
    );

    const l2GatewaySlice = l2Gateways.slice(index, index + INC);
    const result = await l2Multicaller.multiCall(
      l2GatewaySlice.map((addr) => getCallInput(addr, iFace)),
    );
    l1Gateways = l1Gateways.concat(result);
    index += INC;
  }
  for (const curr of l1Gateways) {
    if (typeof curr === 'undefined') {
      throw new Error('undefined l1 gateway!');
    }
  }

  return l1Gateways as string[];
};

export const getL2GatewayAddressesFromL1Token = async (
  l1TokenAddresses: string[],
  l2Multicaller: MultiCaller,
  l2Network: L2Network,
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
    const result = await l2Multicaller.multiCall(
      l1TokenAddressesSlice.map((addr) => ({
        encoder: () => iFace.encodeFunctionData('getGateway', [addr]),
        decoder: (returnData: string) =>
          iFace.decodeFunctionResult('getGateway', returnData)[0] as string,
        targetAddr: l2Network.tokenBridge.l2GatewayRouter,
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

  return await multiCaller.multiCall(
    l1TokenAddresses.map((addr) => ({
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

  return await multiCaller.multiCall(
    l1TokenAddresses.map((addr) => ({
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
  let valid = tokenListIsValid(tokenList);
  const startingTokenListLen = tokenList.tokens.length;

  if (valid) {
    return tokenList;
  } else {
    const tokenListCopy = JSON.parse(
      JSON.stringify(tokenList),
    ) as typeof tokenList;
    console.log('Invalid token list:');
    while (!valid && tokenListCopy.tokens.length > 0) {
      const targetToken = tokenListCopy.tokens.pop();
      const tokenTokenIndex = tokenListCopy.tokens.length;
      valid = tokenListIsValid(tokenListCopy);
      if (valid) {
        console.log('Invalid token token, removing from list', targetToken);

        tokenList.tokens.splice(tokenTokenIndex, 1);
        // pre-recursion sanity check:
        if (tokenList.tokens.length >= startingTokenListLen) {
          throw new Error(
            '666: removeInvalidTokensFromList failed basic sanity check',
          );
        }
        return removeInvalidTokensFromList(tokenList);
      }
    }
    throw new Error('Data does not confirm to token list schema; not sure why');
  }
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
  const urlReplaceForwardSlashes = sourceUrl.replace(/\//g, '_');
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
  str.replace(/[^ \w.'+\-%/À-ÖØ-öø-ÿ:&\[\]\(\)]/gi, '');

export const sanitizeSymbolString = (str: string) =>
  str.replace(/[^\w.'+\-%/À-ÖØ-öø-ÿ:&\[\]\(\)]/gi, '');

export function* getChunks<T>(arr: Array<T>, chunkSize = 500) {
  for (let i = 0; i < arr.length; i += chunkSize) {
    yield arr.slice(i, i + chunkSize);
  }
}

export const promiseRetrier = <T>(createProm: () => Promise<T>): Promise<T> =>
  promiseErrorMultiplier(createProm(), () => createProm());
