import { NATIVE_TOKEN_ADDRESS, withoutUndefined } from './build';
import {
  CuratedToken,
  LifiToken,
  RegistryChain,
  RegistryToken,
  TopToken,
} from './types';

export const TOP_TOKENS_LIMIT = 1_000;

type TokenKey = `${number}:${string}`;

function toTokenKey(chainId: number, address: string): TokenKey {
  return `${chainId}:${address.toLowerCase()}`;
}

// The native token of every chain and the curated tokens are always in, first. LiFi's 24-hour
// volume ranks the rest, across all chains.
export function buildTopTokens({
  chains,
  tokensByChainId,
  lifiTokensByChainId,
  curatedTokenGroups,
  limit = TOP_TOKENS_LIMIT,
}: {
  chains: RegistryChain[];
  tokensByChainId: Map<number, RegistryToken[]>;
  lifiTokensByChainId: Map<number, LifiToken[]>;
  curatedTokenGroups: CuratedToken[][];
  limit?: number;
}): TopToken[] {
  const tokensByKey = new Map<TokenKey, TopToken>();
  for (const [chainId, tokens] of tokensByChainId) {
    for (const token of tokens) {
      tokensByKey.set(
        toTokenKey(chainId, token.address),
        withoutUndefined({
          chainId,
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI,
        }),
      );
    }
  }

  const volumes: [TokenKey, number][] = [];
  for (const [chainId, lifiTokens] of lifiTokensByChainId) {
    for (const { address, volumeUSD24H } of lifiTokens) {
      const key = toTokenKey(chainId, address);
      const token = tokensByKey.get(key);
      if (token && volumeUSD24H && volumeUSD24H > 0) {
        token.volumeUSD24H = volumeUSD24H;
        volumes.push([key, volumeUSD24H]);
      }
    }
  }

  const top = new Map<TokenKey, TopToken>();
  const add = (key: TokenKey) => {
    const token = tokensByKey.get(key);
    if (token && !top.has(key)) {
      top.set(key, token);
    }
  };

  for (const chain of chains) {
    add(toTokenKey(chain.chainId, NATIVE_TOKEN_ADDRESS));
  }
  for (const group of curatedTokenGroups) {
    for (const token of group) {
      add(toTokenKey(token.chainId, token.address));
    }
  }
  for (const [key] of volumes.sort((a, b) => b[1] - a[1])) {
    if (top.size >= limit) {
      break;
    }
    add(key);
  }

  return [...top.values()];
}
