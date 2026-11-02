import { constants } from 'ethers';

import {
  CuratedToken,
  LifiToken,
  RegistryChain,
  RegistryToken,
  TokenListEntry,
} from './types';

export const NATIVE_TOKEN_ADDRESS = constants.AddressZero;

// A child token and its canonical parent token, from the child's bridgeInfo.
export type CanonicalLink = {
  childChainId: number;
  parentChainId: number;
  childAddress: string;
  parentAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
};

type TokenKey = `${number}:${string}`;

function toTokenKey(chainId: number, address: string): TokenKey {
  return `${chainId}:${address.toLowerCase()}`;
}

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as T;
}

export function getCanonicalLinks(
  chains: RegistryChain[],
  listsByUrl: Map<string, TokenListEntry[]>,
): CanonicalLink[] {
  const links: CanonicalLink[] = [];

  for (const chain of chains) {
    const { chainId, parentChainId } = chain;
    if (parentChainId === undefined) {
      continue;
    }

    // The first list that maps a child token wins.
    const seenChildAddresses = new Set<string>();
    for (const url of chain.tokenListUrls) {
      for (const entry of listsByUrl.get(url) ?? []) {
        const parentAddress =
          entry.extensions?.bridgeInfo?.[String(parentChainId)]?.tokenAddress;
        if (entry.chainId !== chainId || !parentAddress) {
          continue;
        }
        const childAddress = entry.address.toLowerCase();
        if (seenChildAddresses.has(childAddress)) {
          continue;
        }
        seenChildAddresses.add(childAddress);
        links.push({
          childChainId: chainId,
          parentChainId,
          childAddress,
          parentAddress: parentAddress.toLowerCase(),
          symbol: entry.symbol,
          name: entry.name,
          decimals: entry.decimals,
          logoURI: entry.logoURI,
        });
      }
    }
  }

  return links;
}

export function getCanonicalParentAddresses(
  links: CanonicalLink[],
  chainId: number,
): string[] {
  return [
    ...new Set(
      links
        .filter((link) => link.parentChainId === chainId)
        .map((link) => link.parentAddress),
    ),
  ];
}

export function buildChainTokens({
  chainId,
  links,
  lifiTokens,
  oftAddresses,
  curatedTokens,
}: {
  chainId: number;
  links: CanonicalLink[];
  // Null when LiFi does not support the chain.
  lifiTokens: LifiToken[] | null;
  oftAddresses: Set<string>;
  curatedTokens: CuratedToken[];
}): RegistryToken[] {
  const byAddress = new Map<string, RegistryToken>();
  // The first source of a token wins its metadata. Later sources only add the fields it lacks.
  const add = (token: RegistryToken) => {
    const address = token.address.toLowerCase();
    const existing = byAddress.get(address);
    byAddress.set(
      address,
      withoutUndefined({ ...token, ...existing, address }),
    );
  };

  add({
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
  });

  // A list entry describes the child token. Its parent only borrows that metadata, so the
  // parent comes after the sources that describe it directly.
  for (const link of links) {
    if (link.childChainId === chainId) {
      add({
        address: link.childAddress,
        symbol: link.symbol,
        name: link.name,
        decimals: link.decimals,
        logoURI: link.logoURI,
        parentAddress: link.parentAddress,
      });
    }
  }

  for (const token of lifiTokens ?? []) {
    add({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
      coinKey: token.coinKey,
    });
  }

  for (const token of curatedTokens) {
    if (token.chainId === chainId) {
      add({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
      });
    }
  }

  for (const link of links) {
    if (link.parentChainId === chainId) {
      add({
        address: link.parentAddress,
        symbol: link.symbol,
        name: link.name,
        decimals: link.decimals,
        logoURI: link.logoURI,
      });
    }
  }

  const lifiAddresses = new Set(
    (lifiTokens ?? []).map((token) => token.address.toLowerCase()),
  );
  return [...byAddress.values()]
    .map((token) => ({
      ...token,
      ...(oftAddresses.has(token.address) ? { isOft: true as const } : {}),
      ...(lifiAddresses.has(token.address)
        ? {}
        : { isNotOnLifi: true as const }),
    }))
    .sort((a, b) => a.address.localeCompare(b.address));
}

// Tokens that bridgeInfo links, directly or through other chains, belong to one family.
function getCanonicalFamilies(
  tokensByChainId: Map<number, RegistryToken[]>,
  chains: RegistryChain[],
): Map<TokenKey, TokenKey[]> {
  const parentKeys = new Map<TokenKey, TokenKey>();
  const find = (key: TokenKey): TokenKey => {
    const parent = parentKeys.get(key);
    if (!parent || parent === key) {
      return key;
    }
    const root = find(parent);
    parentKeys.set(key, root);
    return root;
  };

  for (const chain of chains) {
    if (chain.parentChainId === undefined) {
      continue;
    }
    for (const token of tokensByChainId.get(chain.chainId) ?? []) {
      if (token.parentAddress) {
        const childRoot = find(toTokenKey(chain.chainId, token.address));
        const parentRoot = find(
          toTokenKey(chain.parentChainId, token.parentAddress),
        );
        parentKeys.set(childRoot, parentRoot);
      }
    }
  }

  const families = new Map<TokenKey, TokenKey[]>();
  for (const key of parentKeys.keys()) {
    const root = find(key);
    families.set(root, [...(families.get(root) ?? []), key]);
  }
  for (const [root, members] of families) {
    if (!members.includes(root)) {
      members.push(root);
    }
  }

  const familyByKey = new Map<TokenKey, TokenKey[]>();
  for (const members of families.values()) {
    for (const key of members) {
      familyByKey.set(key, members);
    }
  }
  return familyByKey;
}

function getOnlyAddress(addresses: string[]): string | undefined {
  return addresses.length === 1 ? addresses[0] : undefined;
}

// For each token and each other chain, the first rule that finds exactly one token wins:
// 1. the native token maps to the native token,
// 2. the token's curated group,
// 3. its bridgeInfo family,
// 4. the curated groups that its family belongs to, then those groups' families,
// 5. its LiFi coinKey.
export function addCounterparts({
  chains,
  tokensByChainId,
  curatedTokenGroups,
}: {
  chains: RegistryChain[];
  tokensByChainId: Map<number, RegistryToken[]>;
  curatedTokenGroups: CuratedToken[][];
}): Map<number, RegistryToken[]> {
  const groupByKey = new Map<TokenKey, TokenKey[]>();
  for (const group of curatedTokenGroups) {
    const keys = group.map((token) => toTokenKey(token.chainId, token.address));
    for (const key of keys) {
      groupByKey.set(key, keys);
    }
  }

  const familyByKey = getCanonicalFamilies(tokensByChainId, chains);
  const getFamily = (key: TokenKey) => familyByKey.get(key) ?? [key];

  const coinKeysByChainId = new Map<number, Map<string, TokenKey[]>>();
  for (const [chainId, tokens] of tokensByChainId) {
    const byCoinKey = new Map<string, TokenKey[]>();
    for (const token of tokens) {
      if (token.coinKey) {
        byCoinKey.set(token.coinKey, [
          ...(byCoinKey.get(token.coinKey) ?? []),
          toTokenKey(chainId, token.address),
        ]);
      }
    }
    coinKeysByChainId.set(chainId, byCoinKey);
  }

  const findCounterpart = (
    chainId: number,
    token: RegistryToken,
    targetChainId: number,
  ): string | undefined => {
    if (token.address === NATIVE_TOKEN_ADDRESS) {
      return NATIVE_TOKEN_ADDRESS;
    }

    const prefix = `${targetChainId}:`;
    const findOnTarget = (keys: TokenKey[]) =>
      getOnlyAddress([
        ...new Set(
          keys
            .filter((key) => key.startsWith(prefix))
            .map((key) => key.slice(prefix.length)),
        ),
      ]);

    const key = toTokenKey(chainId, token.address);
    const family = getFamily(key);
    const familyGroups = family.flatMap(
      (member) => groupByKey.get(member) ?? [],
    );
    const candidates: (() => TokenKey[])[] = [
      () => groupByKey.get(key) ?? [],
      () => family,
      () => familyGroups,
      () => familyGroups.flatMap(getFamily),
      () =>
        (token.coinKey &&
          coinKeysByChainId.get(targetChainId)?.get(token.coinKey)) ||
        [],
    ];
    for (const getCandidates of candidates) {
      const address = findOnTarget(getCandidates());
      if (address) {
        return address;
      }
    }
    return undefined;
  };

  const result = new Map<number, RegistryToken[]>();
  for (const [chainId, tokens] of tokensByChainId) {
    result.set(
      chainId,
      tokens.map((token) => {
        const counterparts: Record<string, string> = {};
        for (const target of chains) {
          if (target.chainId === chainId) {
            continue;
          }
          const address = findCounterpart(chainId, token, target.chainId);
          if (address) {
            counterparts[target.chainId] = address;
          }
        }
        return Object.keys(counterparts).length > 0
          ? { ...token, counterparts }
          : token;
      }),
    );
  }
  return result;
}
