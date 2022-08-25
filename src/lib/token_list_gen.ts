import {
  minVersionBump,
  nextVersion,
  VersionUpgrade,
  TokenList,
} from "@uniswap/token-lists";
import { getAllTokens } from "./graph";
import { constants, utils } from "ethers";

import {
  ArbTokenList,
  ArbTokenInfo,
  EtherscanList,
  GraphTokenResult,
} from "./types";
import {
  getL2TokenAddressesFromL1,
  getL2TokenAddressesFromL2,
  getLogoUri,
  getTokenListObj,
  validateTokenListWithErrorThrowing,
  sanitizeNameString,
  sanitizeSymbolString,
  removeInvalidTokensFromList,
  isNova,
  listNameToArbifiedListName,
  getL1TokenAndL2Gateway,
} from "./utils";
import { constants as arbConstants } from "@arbitrum/sdk";
import { getNetworkConfig } from "./instantiate_bridge";
import { getPrevList } from "./store";
import { l2ToL1GatewayAddresses, l2ToL1GatewayAddressesNova } from "./constants";

export interface ArbificationOptions {
  overwriteCurrentList: boolean;
}

function* getChunks<T>(arr: Array<T>, chunkSize = 500) {
  for (let i = 0; i < arr.length; i += chunkSize) {
    yield arr.slice(i, i + chunkSize);
  }
}

const promiseErrorMultiplier = <T, Q extends Error>(
  prom: Promise<T>,
  handler: (err: Q) => Promise<T>,
  tries = 3,
  verbose = false
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

export const generateTokenList = async (
  l1TokenList: TokenList,
  prevArbTokenList?: ArbTokenList,
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
  }
) => {
  if (options?.includeAllL1Tokens && options.includeUnbridgedL1Tokens) {
    throw new Error(
      'Cannot include both of AllL1Tokens and UnbridgedL1Tokens since UnbridgedL1Tokens is a subset of AllL1Tokens.'
    );
  }

  const name = l1TokenList.name;
  const mainLogoUri = l1TokenList.logoURI;

  const { l1, l2 } = await promiseErrorMultiplier(getNetworkConfig(), (error) =>
    getNetworkConfig()
  );

  if (options && options.getAllTokensInNetwork && isNova)
    throw new Error("Subgraph not enabled for nova");

  let tokens: GraphTokenResult[] =
    options && options.getAllTokensInNetwork
      ? await promiseErrorMultiplier(
          getAllTokens(l2.network.chainID),
          (error) => getAllTokens(l2.network.chainID)
        )
      : await promiseErrorMultiplier(
          getL1TokenAndL2Gateway(
            l1TokenList.tokens.map((token) => ({
              addr: token.address.toLowerCase(),
              logo: token.logoURI,
            })),
            l2.multiCaller,
            l2.network
          ),
          (error) =>
            getL1TokenAndL2Gateway(
              l1TokenList.tokens.map((token) => ({
                addr: token.address.toLowerCase(),
                logo: token.logoURI,
              })),
              l2.multiCaller,
              l2.network
            )
        );

  const l1TokenAddresses =
    options && options.getAllTokensInNetwork && !isNova
      ? tokens.map((curr) => curr.l1TokenAddr)
      : l1TokenList.tokens.map((token) => token.address);

  // const l1TokenAddresses = tokens.map(
  //   (token: GraphTokenResult) => token.l1TokenAddr
  // );

  const intermediatel2AddressesFromL1 = [];
  const intermediatel2AddressesFromL2 = [];
  for (const addrs of getChunks(l1TokenAddresses)) {
    const l2AddressesFromL1Temp = await promiseErrorMultiplier(
      getL2TokenAddressesFromL1(
        addrs,
        l1.multiCaller,
        l2.network.tokenBridge.l1GatewayRouter
      ),
      (error) =>
        getL2TokenAddressesFromL1(
          addrs,
          l1.multiCaller,
          l2.network.tokenBridge.l1GatewayRouter
        )
    );
    intermediatel2AddressesFromL1.push(l2AddressesFromL1Temp);
    const l2AddressesFromL2Temp = await promiseErrorMultiplier(
      getL2TokenAddressesFromL2(
        addrs,
        l2.multiCaller,
        l2.network.tokenBridge.l2GatewayRouter
      ),
      (error) =>
        getL2TokenAddressesFromL2(
          addrs,
          l2.multiCaller,
          l2.network.tokenBridge.l2GatewayRouter
        )
    );
    intermediatel2AddressesFromL2.push(l2AddressesFromL2Temp);
  }
  const l2AddressesFromL1 = intermediatel2AddressesFromL1.flat(1);
  const l2AddressesFromL2 = intermediatel2AddressesFromL2.flat(1);

  const logos = l1TokenList.tokens.reduce(
    (acc, curr) => ((acc[curr.address.toLowerCase()] = curr.logoURI), acc),
    {} as { [addr: string]: string | undefined }
  );

  // if the l2 route hasn't been updated yet we remove the token from the bridged tokens
  tokens = tokens.filter(
    (t, i) => l2AddressesFromL1[i] === l2AddressesFromL2[i]
  );

  const intermediateTokenData = [];
  for (const addrs of getChunks(l2AddressesFromL1)) {
    const tokenDataTemp = await promiseErrorMultiplier(
      l2.multiCaller.getTokenData(
        addrs.map((t) => t || constants.AddressZero),
        { name: true, decimals: true, symbol: true }
      ),
      (error) =>
        l2.multiCaller.getTokenData(
          addrs.map((t) => t || constants.AddressZero),
          { name: true, decimals: true, symbol: true }
        )
    );
    intermediateTokenData.push(tokenDataTemp);
  }

  const tokenData = intermediateTokenData.flat(1);

  let arbifiedTokenList: ArbTokenInfo[] = tokens
    .map((t, i) => ({
      token: t,
      l2Address: l2AddressesFromL2[i],
      tokenDatum: tokenData[i],
    }))
    // it's possible that even though l2AddressesFromL1[i] === l2AddressesFromL2[i] these addresses could be the zero address
    // this can happen if the graphql query returns an address that hasnt been bridged
    .filter(
      (t): t is typeof t & { l2Address: string } =>
        t.l2Address != undefined && t.l2Address !== constants.AddressZero
    )
    .map((token, i: number) => {
      const l2GatewayAddress =
        token.token.joinTableEntry[0].gateway.gatewayAddr;
      let { name: _name, decimals, symbol: _symbol } = token.tokenDatum;

      // we queried the L2 token and got nothing, so token doesn't exist yet
      if (decimals === undefined) return undefined;

      _name = (() => {
        if (_name === undefined)
          throw new Error(
            `Unexpected undefined token name: ${JSON.stringify(token)}`
          );
        // if token name is empty, instead set the address as the name
        // we remove the initial 0x since the token list standard only allows up to 40 characters
        else if (_name === '') return token.token.l1TokenAddr.substring(2);
        // parse null terminated bytes32 strings
        else if (_name.length === 64)
          return utils.parseBytes32String('0x' + _name);
        else return _name;
      })();

      _symbol = (() => {
        if (_symbol === undefined)
          throw new Error(
            `Unexpected undefined token symbol: ${JSON.stringify(token)}`
          );
        // schema doesn't allow for empty symbols, and has a max length of 20
        else if (_symbol === '')
          return _name.substring(0, Math.min(_name.length, 20));
        // parse null terminated bytes32 strings
        else if (_symbol.length === 64)
          return utils.parseBytes32String('0x' + _symbol);
        else return _symbol;
      })();

      const name = sanitizeNameString(_name);
      const symbol = sanitizeSymbolString(_symbol);

      const getL2ToL1 = () => {
        if (isNova) {
          return l2ToL1GatewayAddressesNova[l2GatewayAddress.toLowerCase()];
        } else {
          return l2ToL1GatewayAddresses[l2GatewayAddress.toLowerCase()];
        }
      };

      let arbTokenInfo = {
        chainId: +l2.network.chainID,
        address: token.l2Address,
        name,
        symbol,
        decimals,
        logoURI: logos[token.token.l1TokenAddr],
        extensions: {
          bridgeInfo: {
            [l2.network.partnerChainID]: {
              tokenAddress: token.token.l1TokenAddr, // this is the wrong address
              originBridgeAddress: l2GatewayAddress,
              destBridgeAddress: getL2ToL1(),
            },
          },
        },
      };

      if (options && options.includeOldDataFields) {
        arbTokenInfo.extensions = {
          ...arbTokenInfo.extensions,
          // @ts-ignore
          l1Address: token.token.l1TokenAddr,
          l2GatewayAddress: l2GatewayAddress,
          l1GatewayAddress: getL2ToL1(),
        };
      }

      return arbTokenInfo;
    })
    .filter((tokenInfo: ArbTokenInfo | undefined) => {
      return (
        tokenInfo &&
        tokenInfo.extensions &&
        tokenInfo.extensions.bridgeInfo[l2.network.partnerChainID]
          .originBridgeAddress !== arbConstants.DISABLED_GATEWAY
      );
    }) as ArbTokenInfo[];
  arbifiedTokenList.sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

  console.log(`List has ${arbifiedTokenList.length} bridged tokens`);

  const allOtherTokens = l1TokenList.tokens
    .filter((l1TokenInfo) => l1TokenInfo.chainId !== l2.network.chainID)
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
      tokens.map((token) => token.l1TokenAddr.toLowerCase())
    );
    const unbridgedTokens = allOtherTokens
      .filter((l1TokenInfo) => {
        return (
          !l1AddressesOfBridgedTokens.has(l1TokenInfo.address.toLowerCase()) &&
          l1TokenInfo.chainId === +l2.network.partnerChainID
        );
      })
      .sort((a, b) => (a.symbol < b.symbol ? -1 : 1));
    console.log(`List has ${unbridgedTokens.length} unbridged tokens`);

    arbifiedTokenList = arbifiedTokenList.concat(unbridgedTokens);
  }

  const version = (() => {
    if (prevArbTokenList) {
      // @ts-ignore
      let versionBump = minVersionBump(
        prevArbTokenList.tokens,
        arbifiedTokenList
      );

      // tmp: library doesn't nicely handle patches (for extensions object)
      if (versionBump === VersionUpgrade.PATCH) {
        versionBump = VersionUpgrade.NONE;
      }
      return nextVersion(prevArbTokenList.version, versionBump);
    }
    return {
      major: 1,
      minor: 0,
      patch: 0,
    };
  })();

  const arbTokenList: ArbTokenList = {
    name: listNameToArbifiedListName(name),
    timestamp: new Date().toISOString(),
    version,
    tokens: arbifiedTokenList,
    logoURI: mainLogoUri,
  };

  const validationTokenList: ArbTokenList = {
    ...arbTokenList,
    tokens: arbTokenList.tokens,
  };
  validateTokenListWithErrorThrowing(validationTokenList);

  console.log(`Generated list with total ${arbTokenList.tokens.length} tokens`);
  console.log('version:', version);

  return arbTokenList;
};

export const arbifyL1List = async (
  pathOrUrl: string,
  includeOldDataFields?: boolean,
): Promise<ArbTokenList> => {
  const l1TokenList = await promiseErrorMultiplier(
    getTokenListObj(pathOrUrl),
    (error) => getTokenListObj(pathOrUrl)
  );
  removeInvalidTokensFromList(l1TokenList);
  
  const prevArbTokenList = getPrevList(l1TokenList.name)

  const newList = await generateTokenList(l1TokenList, prevArbTokenList, {
    includeAllL1Tokens: true,
    includeOldDataFields,
  });

  return newList
};

export const updateArbifiedList = async (
  pathOrUrl: string,
): Promise<ArbTokenList> => {
  const arbTokenList = await promiseErrorMultiplier(
    getTokenListObj(pathOrUrl),
    (error) => getTokenListObj(pathOrUrl)
  );
  removeInvalidTokensFromList(arbTokenList);

  let prevArbTokenList = getPrevList(arbTokenList.name);

  const newList = await generateTokenList(arbTokenList, prevArbTokenList, {
    includeAllL1Tokens: true,
  });

  return newList
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

  const etherscanData = arbListtoEtherscanList(tokenData);
  return etherscanData;
}

// export const updateLogoURIs = async (path: string)=> {
//   const data = readFileSync(path)
//   const prevArbTokenList =  JSON.parse(data.toString()) as ArbTokenList
//   const tokens:any = []
//   for (let i = 0; i < prevArbTokenList.tokens.length; i++) {
//     const tokenInfo = {...prevArbTokenList.tokens[i]}

//     // @ts-ignore
//     const logoURI = await getLogoUri(tokenInfo.extensions.l1Address)
//     if(logoURI){
//       tokenInfo.logoURI = logoURI
//     } else {
//       console.log('not found:', tokenInfo);
//       delete  tokenInfo.logoURI
//     }
//     tokens.push(tokenInfo)
//   }

//   const newArbList = {...prevArbTokenList, ...{tokens: tokens}}
//   writeFileSync(path, JSON.stringify(newArbList));

// }

export const arbListtoEtherscanList = (
  arbList: ArbTokenList
): EtherscanList => {
  const list: EtherscanList = [];
  arbList.tokens.forEach((tokenInfo) => {
    const { address: l2Address } = tokenInfo;
    if (tokenInfo.extensions) {
      // This assumes one origin chain; should be chill
      const originChainID = Object.keys(tokenInfo.extensions.bridgeInfo)[0];
      const { tokenAddress, originBridgeAddress, destBridgeAddress } =
        tokenInfo.extensions.bridgeInfo[originChainID];
      const data = {
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
