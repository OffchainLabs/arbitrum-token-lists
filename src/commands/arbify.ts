import { ArbTokenInfo, ArbTokenList } from '../lib/types';
import { addPermitTags } from '../PermitTokens/permitSignature';
import { writeToFile } from '../lib/store';
import { Action, Args } from '../lib/options';
import { arbifyL1List } from '../lib/token_list_gen';
import { getTokenListObj, removeInvalidTokensFromList } from '../lib/utils';
import { ChainId } from '../lib/constants';

export const command = Action.Arbify;

export const describe = 'Arbify';

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
type TokenMap = Map<string, ArbTokenInfo>;
function getMapKey(chainId: number | string, tokenAddress: string) {
  // Adding the chainId means the same token on multiple L1 will be under a different key
  return `${chainId}_${tokenAddress.toLowerCase()}`;
}

function updateBridgeInfo(
  token: ArbTokenInfo,
  tokensMap: TokenMap,
  originChainId: number,
  chainId: number,
) {
  const bridgeInfo = token.extensions?.bridgeInfo[originChainId];
  if (!bridgeInfo) {
    console.log('No bridge info found for token', token.address);
    return;
  }

  const mapKey = getMapKey(originChainId, bridgeInfo.tokenAddress);
  const existingToken = tokensMap.get(mapKey);

  if (!existingToken) {
    return;
  }

  const newToken: ArbTokenInfo = {
    ...existingToken,
    extensions: {
      ...existingToken.extensions,
      bridgeInfo: {
        ...(existingToken.extensions?.bridgeInfo as object),
        [chainId]: {
          tokenAddress: token.address,
          originBridgeAddress: bridgeInfo.destBridgeAddress,
          destBridgeAddress: bridgeInfo.originBridgeAddress,
        },
      },
    },
  };
  tokensMap.set(mapKey, newToken);
}

function updateTokensMap(
  tokens: ArbTokenInfo[],
  tokensMap: TokenMap,
  chainId: number,
) {
  // For each L2/L3 tokens, update the parent chain list up to the L1
  return tokens.forEach((token) => {
    const originChainId = Object.keys(token.extensions?.bridgeInfo || {})[0];

    if (!originChainId) {
      console.log('No origin chain id found for token', token.address);
      return;
    }

    updateBridgeInfo(token, tokensMap, Number(originChainId), chainId);
    if (isValidL3(chainId)) {
      const l1ChainId = getL2ParentChain(Number(originChainId));
      if (!l1ChainId) {
        // This should never happen
        throw new Error(`No L1 chain found for L3 token ${token.address}`);
      }
      updateBridgeInfo(token, tokensMap, l1ChainId, chainId);
    }
  });
}
export const handler = async (argvs: Args) => {
  const includeOldDataFields = !!argvs.includeOldDataFields;

  const l1TokenList = await getTokenListObj(argvs.tokenList);
  removeInvalidTokensFromList(l1TokenList);

  // Store all L1 tokens in a map, so we can easily retrieve and update them
  const tokensMap = new Map<string, ArbTokenInfo>(
    l1TokenList.tokens
      .filter((token) => {
        // A L1 token is valid if it's on a valid L1 chain, or if one of its bridgeInfo is a valid L2 chain
        const bridgeInfoKeys = Object.keys(token.extensions?.bridgeInfo || {});
        const hasValidDestinations = bridgeInfoKeys.some((bridgeInfoChainId) =>
          L2_CHAIN_IDS.includes(Number(bridgeInfoChainId)),
        );
        return isValidL1(token.chainId) && hasValidDestinations;
      })
      .map((token) => [
        getMapKey(token.chainId, token.address),
        token as ArbTokenInfo,
      ]),
  );

  await Promise.all(
    L2_CHAIN_IDS.map(async (l2ChainId) => {
      const newList = await arbifyL1List(
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
    }),
  );

  await Promise.all(
    [ChainId.Xai, ChainId.XaiTestnet, ChainId.Rari].map(async (l3ChainId) => {
      const newList = await arbifyL1List(
        argvs.tokenList,
        l1TokenList,
        l3ChainId,
        {
          includeOldDataFields,
          ignorePreviousList: argvs.ignorePreviousList,
          prevArbifiedList: argvs.prevArbifiedList,
        },
      );
      // Update L1 and L2 bridgeInfo for each L3 tokens
      updateTokensMap(newList.tokens, tokensMap, l3ChainId);
      newList.tokens.forEach((token) => {
        tokensMap.set(getMapKey(l3ChainId, token.address), token);
      });
    }),
  );

  let tokenList: ArbTokenList = {
    ...l1TokenList,
    tokens: Array.from(tokensMap.values()),
  };
  if (argvs.includePermitTags) {
    tokenList = await addPermitTags(tokenList, argvs.l2NetworkID);
  }
  writeToFile(tokenList, argvs.newArbifiedList);
  return tokenList;
};
