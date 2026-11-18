import { ArbTokenInfo, ArbTokenList } from './types';

export type TokenMappingsByAddress = Record<string, string>;

export type TokenMappingFile = {
  fromChainId: number;
  toChainId: number;
  timestamp: string;
  mappings: TokenMappingsByAddress;
};

const normalizeAddress = (address: string) => address.toLowerCase();

const getCanonicalTokenKey = (token: ArbTokenInfo): string | undefined => {
  const bridgeInfo = token.extensions?.bridgeInfo;
  if (!bridgeInfo) return undefined;

  const originChainIds = Object.keys(bridgeInfo)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id))
    .sort((a, b) => a - b);

  for (const originChainId of originChainIds) {
    const origin = bridgeInfo[originChainId];
    if (origin?.tokenAddress) {
      return `${originChainId}:${normalizeAddress(origin.tokenAddress)}`;
    }
  }

  return undefined;
};

const pickDeterministicToken = (
  current: ArbTokenInfo | undefined,
  incoming: ArbTokenInfo,
) => {
  if (!current) return incoming;

  if (normalizeAddress(incoming.address) < normalizeAddress(current.address)) {
    return incoming;
  }

  return current;
};

const sortObjectByKey = (obj: Record<string, string>) => {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
  );
};

export const buildTokenMappingFiles = (
  tokenLists: Array<Pick<ArbTokenList, 'tokens'>>,
  timestamp = new Date().toISOString(),
): TokenMappingFile[] => {
  const allTokens = tokenLists.flatMap((list) => list.tokens);

  const knownCanonicalKeys = new Set<string>();
  for (const token of allTokens) {
    const canonicalKey = getCanonicalTokenKey(token);
    if (canonicalKey) knownCanonicalKeys.add(canonicalKey);
  }

  const tokensByCanonicalKeyByChainId = new Map<
    string,
    Map<number, ArbTokenInfo>
  >();

  for (const token of allTokens) {
    let canonicalKey = getCanonicalTokenKey(token);
    if (!canonicalKey) {
      const selfCanonicalKey = `${token.chainId}:${normalizeAddress(
        token.address,
      )}`;
      canonicalKey = knownCanonicalKeys.has(selfCanonicalKey)
        ? selfCanonicalKey
        : undefined;
    }

    if (!canonicalKey) continue;

    const chainIdToToken =
      tokensByCanonicalKeyByChainId.get(canonicalKey) ??
      new Map<number, ArbTokenInfo>();
    const existingToken = chainIdToToken.get(token.chainId);

    chainIdToToken.set(
      token.chainId,
      pickDeterministicToken(existingToken, token),
    );
    tokensByCanonicalKeyByChainId.set(canonicalKey, chainIdToToken);
  }

  const mappingByPair = new Map<string, TokenMappingsByAddress>();

  for (const tokensByChainId of tokensByCanonicalKeyByChainId.values()) {
    const chainIds = Array.from(tokensByChainId.keys()).sort((a, b) => a - b);

    for (const fromChainId of chainIds) {
      for (const toChainId of chainIds) {
        if (fromChainId === toChainId) continue;

        const fromToken = tokensByChainId.get(fromChainId);
        const toToken = tokensByChainId.get(toChainId);
        if (!fromToken || !toToken) continue;

        const pairKey = `${fromChainId}:${toChainId}`;
        const mapping = mappingByPair.get(pairKey) ?? {};

        const sourceAddress = normalizeAddress(fromToken.address);
        const destinationAddress = normalizeAddress(toToken.address);
        const existingDestination = mapping[sourceAddress];

        mapping[sourceAddress] =
          existingDestination &&
          existingDestination.localeCompare(destinationAddress) < 0
            ? existingDestination
            : destinationAddress;
        mappingByPair.set(pairKey, mapping);
      }
    }
  }

  return Array.from(mappingByPair.entries())
    .map(([pairKey, mappings]) => {
      const [fromChainIdString, toChainIdString] = pairKey.split(':');

      return {
        fromChainId: Number(fromChainIdString),
        toChainId: Number(toChainIdString),
        timestamp,
        mappings: sortObjectByKey(mappings),
      };
    })
    .sort((a, b) =>
      a.fromChainId === b.fromChainId
        ? a.toChainId - b.toChainId
        : a.fromChainId - b.fromChainId,
    );
};
