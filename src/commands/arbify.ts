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

function getMapKey(chainId: number | string, tokenAddress: string) {
  // Adding the chainId means the same token on multiple L1 will be under a different key
  return `${tokenAddress.toLowerCase()}`;
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

  const lists = await Promise.all(
    // Arb1, ArbNova, ArbGoerli, ArbSepolia
    // TODO: use ChainId
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
      newList.tokens.forEach((token) => {
        /*
         * If the token is native to L2, we should not add bridge info
         * If the token is bridged from a L1, we need to update bridgeInfo for this L1 token
         */
        const originChainId = Object.keys(
          token.extensions?.bridgeInfo || {},
        )[0];

        if (!originChainId) {
          console.log('No origin chain id found for token', token.address);
          return;
        }

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
              [l2ChainId]: {
                tokenAddress: token.address,
                originBridgeAddress: bridgeInfo.destBridgeAddress,
                destBridgeAddress: bridgeInfo.originBridgeAddress,
              },
            },
          },
        };
        tokensMap.set(mapKey, newToken);
      });
      return newList;
    }),
  );

  const allTokens = lists.map((list) => list.tokens).flat();

  // Convert the L1 tokens back to a list of ArbTokenInfo
  tokensMap.forEach((token) => allTokens.push(token));

  //   [47279324479, 660279, 23011913, 1380012617].forEach(async (l3ChainId) => {
  //     const { newList } = await arbifyL1List(argvs.tokenList, l3ChainId, {
  //       includeOldDataFields,
  //       ignorePreviousList: argvs.ignorePreviousList,
  //       prevArbifiedList: argvs.prevArbifiedList,
  //     });
  //     lists.push(newList);
  //   });

  let tokenList: ArbTokenList = {
    ...l1TokenList,
    tokens: allTokens,
  };
  if (argvs.includePermitTags) {
    tokenList = await addPermitTags(tokenList, argvs.l2NetworkID);
  }
  writeToFile(tokenList, argvs.newArbifiedList);
  return tokenList;
};
