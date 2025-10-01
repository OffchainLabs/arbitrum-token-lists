import { TokenList } from '@uniswap/token-lists';
import { getAllTokens } from './graph';
import { constants, utils } from 'ethers';

import {
  ArbTokenList,
  ArbTokenInfo,
  EtherscanList,
  EtherscanToken,
  GraphTokenResult,
} from './types';
import {
  getL2TokenAddressesFromL1,
  getL2TokenAddressesFromL2,
  getTokenListObj,
  sanitizeNameString,
  sanitizeSymbolString,
  isNetwork,
  listNameToArbifiedListName,
  removeInvalidTokensFromList,
  isValidHttpUrl,
  getFormattedSourceURL,
  getL1TokenAndL2Gateway,
  getChunks,
  promiseErrorMultiplier,
  getL1GatewayAddress,
} from './utils';
import { validateTokenListWithErrorThrowing } from './validateTokenList';
import { constants as arbConstants } from '@arbitrum/sdk';
import { getNetworkConfig } from './instantiate_bridge';
import { getPrevList } from './store';
import { getArgvs } from './options';
import { BridgedUSDCContractAddressArb1 } from './constants';
import { getVersion } from './getVersion';
import { extractCacheFromTokenList } from './tokenListCache';

export interface ArbificationOptions {
  overwriteCurrentList: boolean;
}

export const generateTokenList = async (
  l1TokenList: TokenList,
  prevArbTokenList?: ArbTokenList | null,
  options?: {
    /**
     * Append all tokens from the original l1TokenList to the output list.
     */
    includeAllL1Tokens?: boolean;
    /**
     * Append all unbridged tokens from original l1TokenList to the output list.
     */
    includeUnbridgedL1Tokens?: boolean;
    getAllTokensInNetwork?: boolean;
    includeOldDataFields?: boolean;
    sourceListURL?: string;
    preserveListName?: boolean;
  },
) => {
  if (options?.includeAllL1Tokens && options.includeUnbridgedL1Tokens) {
    throw new Error(
      'Cannot include both of AllL1Tokens and UnbridgedL1Tokens since UnbridgedL1Tokens is a subset of AllL1Tokens.',
    );
  }

  const name = l1TokenList.name;
  const mainLogoUri = l1TokenList.logoURI;

  const { l1, l2 } = await promiseErrorMultiplier(getNetworkConfig(), () =>
    getNetworkConfig(),
  );

  const { isNova } = isNetwork();
  if (options && options.getAllTokensInNetwork && isNova)
    throw new Error('Subgraph not enabled for nova');

  const l1TokenListL1Tokens = l1TokenList.tokens.filter(
    (token) => token.chainId === l1.provider.network.chainId,
  );

  let tokens: GraphTokenResult[] =
    options && options.getAllTokensInNetwork
      ? await promiseErrorMultiplier(getAllTokens(l2.network.chainId), () =>
          getAllTokens(l2.network.chainId),
        )
      : await promiseErrorMultiplier(
          getL1TokenAndL2Gateway(
            l1TokenListL1Tokens.map((token) => ({
              addr: token.address.toLowerCase(),
              logo: token.logoURI,
            })),
            l2.multiCaller,
            l2.network,
          ),
          () =>
            getL1TokenAndL2Gateway(
              l1TokenListL1Tokens.map((token) => ({
                addr: token.address.toLowerCase(),
                logo: token.logoURI,
              })),
              l2.multiCaller,
              l2.network,
            ),
        );

  const l1TokenAddresses =
    options && options.getAllTokensInNetwork && !isNova
      ? tokens.map((curr) => curr.l1TokenAddr)
      : l1TokenListL1Tokens.map((token) => token.address);

  const tokenBridge = l2.network.tokenBridge;

  if (!tokenBridge) {
    throw new Error('Child network is missing tokenBridge');
  }

  const intermediatel2AddressesFromL1 = [];
  const intermediatel2AddressesFromL2 = [];
  for (const addrs of getChunks(l1TokenAddresses)) {
    const l2AddressesFromL1Temp = await promiseErrorMultiplier(
      getL2TokenAddressesFromL1(
        addrs,
        l1.multiCaller,
        tokenBridge.parentGatewayRouter,
      ),
      () =>
        getL2TokenAddressesFromL1(
          addrs,
          l1.multiCaller,
          tokenBridge.parentGatewayRouter,
        ),
    );
    intermediatel2AddressesFromL1.push(l2AddressesFromL1Temp);
    const l2AddressesFromL2Temp = await promiseErrorMultiplier(
      getL2TokenAddressesFromL2(
        addrs,
        l2.multiCaller,
        tokenBridge.childGatewayRouter,
      ),
      () =>
        getL2TokenAddressesFromL2(
          addrs,
          l2.multiCaller,
          tokenBridge.childGatewayRouter,
        ),
    );
    intermediatel2AddressesFromL2.push(l2AddressesFromL2Temp);
  }
  let l2AddressesFromL1 = intermediatel2AddressesFromL1.flat(1);
  let l2AddressesFromL2 = intermediatel2AddressesFromL2.flat(1);

  const logos = l1TokenList.tokens.reduce(
    (acc, curr) => ((acc[curr.address.toLowerCase()] = curr.logoURI), acc),
    {} as { [addr: string]: string | undefined },
  );

  // if the l2 route hasn't been updated yet we remove the token from the bridged tokens
  const filteredTokens: GraphTokenResult[] = [];
  const filteredL2AddressesFromL1: string[] = [];
  const filteredL2AddressesFromL2: string[] = [];
  tokens.forEach((t, i) => {
    const l2AddressFromL1 = l2AddressesFromL1[i];
    if (l2AddressFromL1 && l2AddressesFromL1[i] === l2AddressesFromL2[i]) {
      filteredTokens.push(t);
      filteredL2AddressesFromL1.push(l2AddressFromL1);
      filteredL2AddressesFromL2.push(l2AddressFromL1);
    }
  });
  tokens = filteredTokens;
  l2AddressesFromL1 = filteredL2AddressesFromL1;
  l2AddressesFromL2 = filteredL2AddressesFromL1;

  // Load metadata cache from previous token list (already loaded by caller)
  const { metadataCache } = prevArbTokenList
    ? extractCacheFromTokenList(prevArbTokenList)
    : { metadataCache: {} };

  let cacheHits = 0;
  let cacheMisses = 0;

  // Build token data array using cache where possible
  const tokenData: Array<
    | {
        name: string | undefined;
        symbol: string | undefined;
        decimals: number | undefined;
      }
    | undefined
  > = [];

  const uncachedAddresses: string[] = [];
  const uncachedIndices: number[] = [];

  for (let i = 0; i < l2AddressesFromL1.length; i++) {
    const addr = l2AddressesFromL1[i];
    if (!addr || addr === constants.AddressZero) {
      tokenData.push(undefined);
      continue;
    }

    const cacheKey = `${l2.network.chainId}:${addr.toLowerCase()}`;
    const cached = metadataCache[cacheKey];

    if (cached) {
      tokenData.push(cached);
      cacheHits++;
    } else {
      tokenData.push(undefined);
      uncachedAddresses.push(addr);
      uncachedIndices.push(i);
      cacheMisses++;
    }
  }

  console.log(
    `Metadata cache (from existing token lists): ${cacheHits} hits, ${cacheMisses} misses`,
  );

  // Fetch uncached token data
  if (uncachedAddresses.length > 0) {
    const intermediateTokenData = [];
    for (const addrs of getChunks(uncachedAddresses, 100)) {
      const tokenDataTemp = await promiseErrorMultiplier(
        l2.multiCaller.getTokenData(addrs, {
          name: true,
          decimals: true,
          symbol: true,
        }),
        () =>
          l2.multiCaller.getTokenData(addrs, {
            name: true,
            decimals: true,
            symbol: true,
          }),
      );
      intermediateTokenData.push(tokenDataTemp);
    }

    const fetchedData = intermediateTokenData.flat(1);

    // Merge fetched data back into tokenData array
    for (let i = 0; i < fetchedData.length; i++) {
      const originalIndex = uncachedIndices[i];
      const data = fetchedData[i];

      tokenData[originalIndex] = data;

      // Note: New metadata will be included in the generated token list,
      // which gets deployed to S3 and becomes the cache for the next run
    }
  }

  const _arbifiedTokenList = tokens
    .map((t, i) => ({
      token: t,
      l2Address: l2AddressesFromL2[i],
      tokenDatum: tokenData[i],
    }))
    // it's possible that even though l2AddressesFromL1[i] === l2AddressesFromL2[i] these addresses could be the zero address
    // this can happen if the graphql query returns an address that hasnt been bridged
    .filter(
      (t): t is typeof t & { l2Address: string } =>
        t.l2Address != undefined && t.l2Address !== constants.AddressZero,
    )
    .map((token) => {
      const l2GatewayAddress =
        token.token.joinTableEntry[0].gateway.gatewayAddr;
      const l1GatewayAddress = getL1GatewayAddress(l2GatewayAddress) ?? 'N/A';

      const tokenDatum = token.tokenDatum;
      if (!tokenDatum) return undefined;

      let { name: _name, decimals, symbol: _symbol } = tokenDatum;

      // we queried the L2 token and got nothing, so token doesn't exist yet
      if (decimals === undefined) return undefined;

      _name = (() => {
        if (_name === undefined)
          throw new Error(
            `Unexpected undefined token name: ${JSON.stringify(token)}`,
          );
        // if token name is empty, instead set the address as the name
        // we remove the initial 0x since the token list standard only allows up to 40 characters
        else if (_name === '') return token.token.l1TokenAddr.substring(2);
        // parse null terminated bytes32 strings
        else if (_name.length === 64)
          return utils.parseBytes32String('0x' + _name);
        else if (
          token.l2Address.toLowerCase() ===
          BridgedUSDCContractAddressArb1.toLowerCase()
        ) {
          return 'Bridged USDC';
        } else return _name;
      })();

      _symbol = (() => {
        if (_symbol === undefined)
          throw new Error(
            `Unexpected undefined token symbol: ${JSON.stringify(token)}`,
          );
        // schema doesn't allow for empty symbols, and has a max length of 20
        else if (_symbol === '')
          return _name.substring(0, Math.min(_name.length, 20));
        // parse null terminated bytes32 strings
        else if (_symbol.length === 64)
          return utils.parseBytes32String('0x' + _symbol);
        else if (
          token.l2Address.toLowerCase() ===
          BridgedUSDCContractAddressArb1.toLowerCase()
        ) {
          return 'USDC.e';
        } else return _symbol;
      })();

      const name = sanitizeNameString(_name);
      const symbol = sanitizeSymbolString(_symbol);

      const arbTokenInfo: ArbTokenInfo = {
        chainId: Number(l2.network.chainId),
        address: token.l2Address,
        name,
        symbol,
        decimals,
        logoURI: logos[token.token.l1TokenAddr],
        extensions: {
          bridgeInfo: {
            [l2.network.parentChainId]: {
              tokenAddress: token.token.l1TokenAddr, // this is the wrong address
              originBridgeAddress: l2GatewayAddress,
              destBridgeAddress: l1GatewayAddress,
            },
          },
          ...(options?.includeOldDataFields
            ? {
                l1Address: token.token.l1TokenAddr,
                l2GatewayAddress: l2GatewayAddress,
                l1GatewayAddress: l1GatewayAddress,
              }
            : {}),
        },
      };

      return arbTokenInfo;
    });

  let arbifiedTokenList: ArbTokenInfo[] = (
    await Promise.all(_arbifiedTokenList)
  ).filter((tokenInfo: ArbTokenInfo | undefined) => {
    return (
      tokenInfo &&
      tokenInfo.extensions &&
      tokenInfo.extensions.bridgeInfo[l2.network.parentChainId]
        .originBridgeAddress !== arbConstants.DISABLED_GATEWAY
    );
  }) as ArbTokenInfo[];
  arbifiedTokenList.sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

  console.log(`List has ${arbifiedTokenList.length} bridged tokens`);

  const allOtherTokens = l1TokenList.tokens
    .filter((l1TokenInfo) => l1TokenInfo.chainId !== l2.network.chainId)
    .map((l1TokenInfo) => {
      return {
        chainId: +l1TokenInfo.chainId,
        name: l1TokenInfo.name,
        address: l1TokenInfo.address,
        symbol: l1TokenInfo.symbol,
        decimals: l1TokenInfo.decimals,
        logoURI: l1TokenInfo.logoURI,
      };
    });

  if (options?.includeAllL1Tokens) {
    arbifiedTokenList = arbifiedTokenList.concat(allOtherTokens);
  } else if (options?.includeUnbridgedL1Tokens) {
    const l1AddressesOfBridgedTokens = new Set(
      tokens.map((token) => token.l1TokenAddr.toLowerCase()),
    );
    const unbridgedTokens = allOtherTokens
      .filter((l1TokenInfo) => {
        return (
          !l1AddressesOfBridgedTokens.has(l1TokenInfo.address.toLowerCase()) &&
          l1TokenInfo.chainId === +l2.network.parentChainId
        );
      })
      .sort((a, b) => (a.symbol < b.symbol ? -1 : 1));
    console.log(`List has ${unbridgedTokens.length} unbridged tokens`);

    arbifiedTokenList = arbifiedTokenList.concat(unbridgedTokens);
  }

  const version = getVersion(prevArbTokenList, arbifiedTokenList);

  const sourceListURL = getFormattedSourceURL(options?.sourceListURL);
  const arbTokenList: ArbTokenList = {
    name:
      options && options.preserveListName
        ? name
        : listNameToArbifiedListName(name, l2.network.chainId),
    timestamp: new Date().toISOString(),
    version,
    tokens: arbifiedTokenList,
    logoURI: mainLogoUri,
    ...(sourceListURL && {
      tags: {
        sourceList: {
          name: 'Source list url',
          description: `${sourceListURL} replace __ with forwardslash`,
        },
      },
    }),
  };

  const validationTokenList: ArbTokenList = {
    ...arbTokenList,
    tokens: arbTokenList.tokens,
  };

  const argvs = getArgvs();
  if (!argvs.skipValidation) {
    validateTokenListWithErrorThrowing(validationTokenList);
  }

  console.log(`Generated list with total ${arbTokenList.tokens.length} tokens`);
  console.log('version:', version);

  return arbTokenList;
};

export const arbifyL1List = async (
  pathOrUrl: string,
  {
    includeOldDataFields,
    ignorePreviousList,
    prevArbifiedList,
  }: {
    includeOldDataFields: boolean;
    ignorePreviousList: boolean;
    prevArbifiedList: string | undefined;
  },
): Promise<{
  newList: ArbTokenList;
  l1ListName: string;
}> => {
  const l1TokenList = await getTokenListObj(pathOrUrl);

  removeInvalidTokensFromList(l1TokenList);
  const prevArbTokenList = ignorePreviousList
    ? null
    : await getPrevList(prevArbifiedList);

  // We can't arbify token list for base, we filter out non-base tokens from uniswap list
  const argv = getArgvs();
  if (argv.l2NetworkID === 8453 || argv.l2NetworkID === 84532) {
    const tokens = l1TokenList.tokens
      .filter((token) => token.chainId === argv.l2NetworkID)
      .map(({ extensions, ...token }) => ({
        ...token,
      }));

    const version = getVersion(prevArbTokenList, tokens);
    return {
      newList: {
        ...l1TokenList,
        name: `Uniswap labs ${argv.l2NetworkID}`,
        timestamp: new Date().toISOString(),
        version,
        tokens,
      },
      l1ListName: l1TokenList.name,
    };
  }

  const newList = await generateTokenList(l1TokenList, prevArbTokenList, {
    includeAllL1Tokens: false,
    includeOldDataFields,
    sourceListURL: isValidHttpUrl(pathOrUrl) ? pathOrUrl : undefined,
  });

  return {
    newList,
    l1ListName: l1TokenList.name,
  };
};

export const updateArbifiedList = async (
  pathOrUrl: string,
  {
    includeOldDataFields,
    ignorePreviousList,
    prevArbifiedList,
  }: {
    includeOldDataFields: boolean;
    ignorePreviousList: boolean;
    prevArbifiedList: string | undefined;
  },
) => {
  const arbTokenList = await getTokenListObj(pathOrUrl);
  removeInvalidTokensFromList(arbTokenList);
  const prevArbTokenList = ignorePreviousList
    ? null
    : await getPrevList(prevArbifiedList);

  const newList = await generateTokenList(arbTokenList, prevArbTokenList, {
    includeAllL1Tokens: true,
    sourceListURL: isValidHttpUrl(pathOrUrl) ? pathOrUrl : undefined,
    includeOldDataFields,
    preserveListName: true,
  });

  return {
    newList,
  };
};

export const generateFullList = async () => {
  const mockList: TokenList = {
    name: 'Full',
    logoURI: 'ipfs://QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y',
    timestamp: new Date().toISOString(),
    version: {
      major: 1,
      minor: 0,
      patch: 0,
    },
    tokens: [],
  };
  const tokenData = await generateTokenList(mockList, undefined, {
    getAllTokensInNetwork: true,
  });

  return arbListtoEtherscanList(tokenData);
};
export const generateFullListFormatted = async () => {
  const mockList: TokenList = {
    name: 'Full',
    logoURI: 'ipfs://QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y',
    timestamp: new Date().toISOString(),
    version: {
      major: 1,
      minor: 0,
      patch: 0,
    },
    tokens: [],
  };
  const allTokenList = await generateTokenList(mockList, undefined, {
    getAllTokensInNetwork: true,
  });
  // log for human-readable check
  allTokenList.tokens.forEach((token) => {
    console.log(token.name, token.symbol, token.address);
  });
  return allTokenList;
};

export const arbListtoEtherscanList = (
  arbList: ArbTokenList,
): EtherscanList => {
  const list: EtherscanList = [];
  arbList.tokens.forEach((tokenInfo) => {
    const { address: l2Address } = tokenInfo;
    if (tokenInfo.extensions) {
      // This assumes one origin chain; should be chill
      const originChainID = Object.keys(tokenInfo.extensions.bridgeInfo)[0];
      const { tokenAddress, originBridgeAddress, destBridgeAddress } =
        tokenInfo.extensions.bridgeInfo[originChainID];
      const data: EtherscanToken = {
        l1Address: tokenAddress,
        l2Address,
        l1GatewayAddress: destBridgeAddress,
        l2GatewayAddress: originBridgeAddress,
      };
      list.push(data);
    }
  });
  return list;
};
