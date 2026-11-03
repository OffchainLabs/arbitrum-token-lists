import { NATIVE_TOKEN_ADDRESS, withoutUndefined } from './build';
import {
  CuratedToken,
  LifiToken,
  RegistryChain,
  RegistryToken,
  TopToken,
} from './types';

export const TOP_TOKENS_PER_CHAIN = 1_000;

// Like Jumper, each chain gets its own top tokens: the native token and the curated tokens first,
// then the tokens LiFi has a 24-hour volume for, by volume, then the others by symbol.
export function buildTopTokens({
  chains,
  tokensByChainId,
  lifiTokensByChainId,
  curatedTokenGroups,
  limit = TOP_TOKENS_PER_CHAIN,
}: {
  chains: RegistryChain[];
  tokensByChainId: Map<number, RegistryToken[]>;
  lifiTokensByChainId: Map<number, LifiToken[]>;
  curatedTokenGroups: CuratedToken[][];
  limit?: number;
}): TopToken[] {
  const curatedTokens = curatedTokenGroups.flat();

  return chains.flatMap(({ chainId }) => {
    const volumes = new Map<string, number>();
    for (const { address, volumeUSD24H } of lifiTokensByChainId.get(chainId) ??
      []) {
      if (volumeUSD24H && volumeUSD24H > 0) {
        volumes.set(address.toLowerCase(), volumeUSD24H);
      }
    }

    const tokens = new Map(
      (tokensByChainId.get(chainId) ?? []).map((token) => [
        token.address,
        withoutUndefined<TopToken>({
          chainId,
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI,
          volumeUSD24H: volumes.get(token.address),
        }),
      ]),
    );

    const top = new Map<string, TopToken>();
    const add = (address: string) => {
      const token = tokens.get(address.toLowerCase());
      if (token && !top.has(token.address)) {
        top.set(token.address, token);
      }
    };

    add(NATIVE_TOKEN_ADDRESS);
    for (const token of curatedTokens) {
      if (token.chainId === chainId) {
        add(token.address);
      }
    }

    const ranked = [...tokens.values()].sort(
      (a, b) =>
        (b.volumeUSD24H ?? 0) - (a.volumeUSD24H ?? 0) ||
        a.symbol.localeCompare(b.symbol),
    );
    for (const token of ranked) {
      if (top.size >= limit) {
        break;
      }
      add(token.address);
    }

    return [...top.values()];
  });
}
