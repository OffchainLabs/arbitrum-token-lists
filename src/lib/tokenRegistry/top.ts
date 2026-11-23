import { NATIVE_TOKEN_ADDRESS, withoutUndefined } from './build';
import {
  CuratedToken,
  LifiToken,
  RegistryChain,
  RegistryToken,
  TopToken,
} from './types';

export const TOP_TOKENS_PER_CHAIN = 1_000;

// Each chain keeps its native token, its curated tokens and its most traded tokens, up to the limit.
// The file then orders every chain's tokens together by LiFi's 24-hour volume, most traded first.
// The tokens without volume follow, by symbol. A token's rank is its position in the file. The
// volume is not written to the file.
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
  const volumes = new Map<string, number>();
  const topByChainId = new Map<number, Map<string, TopToken>>();

  for (const { chainId } of chains) {
    const chainVolumes = new Map<string, number>();
    for (const { address, volumeUSD24H } of lifiTokensByChainId.get(chainId) ??
      []) {
      if (volumeUSD24H && volumeUSD24H > 0) {
        chainVolumes.set(address.toLowerCase(), volumeUSD24H);
        volumes.set(toKey(chainId, address), volumeUSD24H);
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
        (chainVolumes.get(b.address) ?? 0) -
          (chainVolumes.get(a.address) ?? 0) ||
        a.symbol.localeCompare(b.symbol),
    );
    for (const token of ranked) {
      if (top.size >= limit) {
        break;
      }
      add(token.address);
    }

    topByChainId.set(chainId, top);
  }

  const volume = (token: TopToken) =>
    volumes.get(toKey(token.chainId, token.address)) ?? 0;
  return [...topByChainId.values()]
    .flatMap((top) => [...top.values()])
    .sort(
      (a, b) =>
        volume(b) - volume(a) ||
        a.symbol.localeCompare(b.symbol) ||
        a.chainId - b.chainId,
    );
}

function toKey(chainId: number, address: string): string {
  return `${chainId}:${address.toLowerCase()}`;
}
