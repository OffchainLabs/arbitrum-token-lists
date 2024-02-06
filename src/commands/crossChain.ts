import { ArbTokenInfo, ArbTokenList } from '../lib/types';
import { addPermitTags } from '../PermitTokens/permitSignature';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';
import { arbifyL1List } from '../lib/token_list_gen';
import { getTokenListObj, removeInvalidTokensFromList } from '../lib/utils';
import { ChainId } from '../lib/constants';

export const command = Action.CrossChain;

export const describe = 'Cross-chain';

const L2_CHAIN_IDS = [
  ChainId.ArbitrumOne,
  ChainId.ArbitrumNova,
  ChainId.ArbitrumGoerli,
  ChainId.ArbitrumSepolia,
];
function isValidL1(chainId: number) {
  return [ChainId.Ethereum, ChainId.Goerli, ChainId.Sepolia].includes(chainId);
}
function isValidL2(chainId: number) {
  return L2_CHAIN_IDS.includes(chainId);
}
function isValidL3(chainId: number) {
  return !isValidL1(chainId) && !isValidL2(chainId);
}
function getL2ParentChain(chainId: number) {
  return {
    [ChainId.ArbitrumOne]: ChainId.Ethereum,
    [ChainId.ArbitrumNova]: ChainId.Ethereum,
    [ChainId.ArbitrumSepolia]: ChainId.Sepolia,
    [ChainId.ArbitrumGoerli]: ChainId.Goerli,
  }[chainId];
}
function getL3ParentChain(chainId: number) {
  return {
    [ChainId.Xai]: ChainId.ArbitrumOne,
    [ChainId.XaiTestnet]: ChainId.ArbitrumGoerli,
    [ChainId.Rari]: ChainId.ArbitrumOne,
  }[chainId];
}

type TokensMap = Map<string, ArbTokenInfo>;
function getMapKey(chainId: number | string, tokenAddress: string) {
  return `${chainId}_${tokenAddress.toLowerCase()}`;
}

// Update token in tokensMap with new bridgeInfo
function updateBridgeInfo(
  mapKey: string,
  tokensMap: TokensMap,
  bridgeInfo: {
    [chainId: number]: {
      tokenAddress: string;
      originBridgeAddress: string;
      destBridgeAddress: string;
    };
  },
) {
  const existingToken = tokensMap.get(mapKey);
  if (!existingToken) {
    console.log('Token not found in TokensMap', mapKey);
    return;
  }

  const newToken: ArbTokenInfo = {
    ...existingToken,
    extensions: {
      bridgeInfo: {
        ...(existingToken.extensions?.bridgeInfo as object),
        ...bridgeInfo,
      },
    },
  };
  tokensMap.set(mapKey, newToken);
  return newToken;
}

function updateTokensMap(
  tokens: ArbTokenInfo[],
  tokensMap: TokensMap,
  chainId: number,
) {
  // For each L2/L3 tokens, update the parents chain list up to the L1
  return tokens.forEach((token) => {
    const originChainId = Object.keys(token.extensions?.bridgeInfo || {})[0];

    if (!originChainId) {
      console.log('No origin chain id found for token', token.address);
      return;
    }

    const bridgeInfo = token.extensions?.bridgeInfo[originChainId];
    if (!bridgeInfo) {
      console.log('No bridge info found for token', token.address);
      return;
    }

    // Update the direct parent chain's bridgeInfo
    const updatedToken = updateBridgeInfo(
      getMapKey(originChainId, bridgeInfo.tokenAddress),
      tokensMap,
      {
        [chainId]: {
          tokenAddress: token.address,
          destBridgeAddress: bridgeInfo.destBridgeAddress,
          originBridgeAddress: bridgeInfo.originBridgeAddress,
        },
      },
    );

    if (!updatedToken || !isValidL3(chainId)) {
      return;
    }

    const l1ChainId = getL2ParentChain(Number(originChainId));
    if (!l1ChainId) {
      // This should never happen
      throw new Error(`No L1 chain found for L3 token ${token.address}`);
    }

    const l1Address =
      updatedToken.extensions!.bridgeInfo[l1ChainId].tokenAddress;
    // Update the L3 bridgeInfo with L1 information
    updateBridgeInfo(getMapKey(chainId, token.address), tokensMap, {
      [l1ChainId]: {
        tokenAddress: l1Address,
        destBridgeAddress: 'N/A',
        originBridgeAddress: 'N/A',
      },
    });

    // Update the L1 bridgeInfo with L3 information
    updateBridgeInfo(getMapKey(l1ChainId, l1Address), tokensMap, {
      [chainId]: {
        tokenAddress: token.address,
        destBridgeAddress: 'N/A',
        originBridgeAddress: 'N/A',
      },
    });
  });
}
export const handler = async (argvs: Args) => {
  const includeOldDataFields = !!argvs.includeOldDataFields;

  const l1TokenList = await getTokenListObj(argvs.tokenList);
  removeInvalidTokensFromList(l1TokenList);

  // Store all L1 tokens in a map, so we can easily retrieve and update them
  const tokensMap = new Map<string, ArbTokenInfo>(
    l1TokenList.tokens
      .filter((token) => isValidL1(token.chainId))
      .map((token) => [
        getMapKey(token.chainId, token.address),
        token as ArbTokenInfo,
      ]),
  );

  const l2Lists = new Map<number, ArbTokenList>();
  await Promise.all(
    L2_CHAIN_IDS.map(async (l2ChainId) => {
      let newList = await arbifyL1List(
        argvs.tokenList,
        l1TokenList,
        l2ChainId,
        {
          includeOldDataFields,
          ignorePreviousList: argvs.ignorePreviousList,
          prevArbifiedList: argvs.prevArbifiedList,
        },
      );

      // Update L1 bridgeInfo for each L2 tokens
      updateTokensMap(newList.tokens, tokensMap, l2ChainId);
      // Add the token to tokensMap, so we can update it later with L3 bridgeInfo
      newList.tokens.forEach((token) => {
        tokensMap.set(getMapKey(l2ChainId, token.address), token);
      });

      l2Lists.set(l2ChainId, newList);
      if (argvs.includePermitTags) {
        newList = await addPermitTags(tokenList, l2ChainId);
      }
    }),
  );

  const l3Lists = new Map<number, ArbTokenList>();
  await Promise.all(
    [ChainId.Xai, ChainId.XaiTestnet, ChainId.Rari].map(async (l3ChainId) => {
      const parentChain = getL3ParentChain(l3ChainId)!;
      const l2TokenList = l2Lists.get(parentChain);
      if (!l2TokenList) {
        throw new Error(`No L2 list to arbify for L3 chain: ${l3ChainId}`);
      }

      const newList = await arbifyL1List(
        argvs.tokenList,
        l2TokenList,
        l3ChainId,
        {
          includeOldDataFields,
          ignorePreviousList: argvs.ignorePreviousList,
          prevArbifiedList: argvs.prevArbifiedList,
        },
      );
      newList.tokens.forEach((token) => {
        tokensMap.set(getMapKey(l3ChainId, token.address), token);
      });
      // Update L1 and L2 bridgeInfo for each L3 tokens
      l3Lists.set(l3ChainId, newList);
      updateTokensMap(newList.tokens, tokensMap, l3ChainId);
    }),
  );

  const tokenList: ArbTokenList = {
    ...l1TokenList,
    tokens: Array.from(tokensMap.values()),
  };

  writeToFile(tokenList, argvs.newArbifiedList);
  return tokenList;
};
