import { ArbitrumNetwork } from '@arbitrum/sdk';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  addCounterparts,
  buildChainTokens,
  getCanonicalLinks,
  getCanonicalParentAddresses,
} from './build';
import {
  getRegistryChains,
  getRegistryPairs,
  isLifiPair,
  pairKey,
} from './chains';
import { curatedTokenGroups } from './curatedTokens';
import {
  HttpError,
  fetchJson,
  fetchLifiChainIds,
  fetchLifiConnection,
  fetchLifiTokens,
  fetchTokenList,
} from './fetch';
import { fetchNativeTokenLinks } from './nativeTokens';
import { findOftTokens } from './oft';
import { buildTopTokens } from './top';
import {
  ChainFile,
  IndexFile,
  LifiConnection,
  LifiToken,
  PairFile,
  REGISTRY_VERSION,
  RegistryToken,
  TopFile,
} from './types';
import { toV2Files } from './v2';

const PUBLISHED_URL = `https://tokenlist.arbitrum.io/TokenRegistry/v${REGISTRY_VERSION}`;

// A file that lost more than this share of its tokens since the published version is not
// written, so a failing source cannot replace a good registry with an empty one.
const MAX_SHRINK = 0.2;

export function checkShrink({
  file,
  count,
  publishedCount,
}: {
  file: string;
  count: number;
  publishedCount: number | undefined;
}) {
  if (
    publishedCount !== undefined &&
    count < publishedCount * (1 - MAX_SHRINK)
  ) {
    throw new Error(
      `${file} has ${count} tokens, down from ${publishedCount} in the published version`,
    );
  }
}

async function fetchPublished<T>(file: string): Promise<T | undefined> {
  try {
    return await fetchJson<T>(`${PUBLISHED_URL}/${file}`);
  } catch (error) {
    if (
      error instanceof HttpError &&
      (error.status === 403 || error.status === 404)
    ) {
      return undefined;
    }
    throw error;
  }
}

function countPairTokens(lifi: LifiConnection | undefined): number {
  return (lifi?.fromTokens.length ?? 0) + (lifi?.toTokens.length ?? 0);
}

// LiFi can connect tokens that its /v1/tokens does not list. Nothing can route them.
function keepListedTokens(
  addresses: string[],
  listed: Set<string> | undefined,
): string[] {
  return addresses.filter((address) => listed?.has(address));
}

export async function generateTokenRegistry({
  orbitNetworks,
  rpcUrls,
  outputDir,
}: {
  orbitNetworks: ArbitrumNetwork[];
  rpcUrls: Record<number, string>;
  outputDir: string;
}) {
  const generatedAt = new Date().toISOString();
  const chains = getRegistryChains(orbitNetworks);
  const lifiChainIds = await fetchLifiChainIds();

  const urls = [...new Set(chains.flatMap((chain) => chain.tokenListUrls))];
  const listsByUrl = new Map(
    await Promise.all(
      urls.map(async (url) => [url, await fetchTokenList(url)] as const),
    ),
  );
  const links = [
    ...getCanonicalLinks(chains, listsByUrl),
    ...(await fetchNativeTokenLinks({ chains, rpcUrls })),
  ];

  // One chain at a time, to stay under LiFi's rate limit.
  const builtTokens = new Map<number, RegistryToken[]>();
  const lifiTokensByChainId = new Map<number, LifiToken[]>();
  const lifiAddressesByChainId = new Map<number, Set<string>>();
  for (const chain of chains) {
    const lifiTokens = lifiChainIds.has(chain.chainId)
      ? await fetchLifiTokens(chain.chainId)
      : null;
    if (lifiTokens) {
      lifiTokensByChainId.set(chain.chainId, lifiTokens);
    }
    lifiAddressesByChainId.set(
      chain.chainId,
      new Set((lifiTokens ?? []).map((token) => token.address.toLowerCase())),
    );

    const parentAddresses = getCanonicalParentAddresses(links, chain.chainId);
    let oftAddresses = new Set<string>();
    if (parentAddresses.length > 0) {
      const rpcUrl = rpcUrls[chain.chainId];
      if (!rpcUrl) {
        throw new Error(`No RPC for ${chain.name} (${chain.chainId})`);
      }
      oftAddresses = await findOftTokens({
        rpcUrl,
        addresses: parentAddresses,
      });
    }

    builtTokens.set(
      chain.chainId,
      buildChainTokens({
        chainId: chain.chainId,
        links,
        lifiTokens,
        oftAddresses,
        curatedTokens: curatedTokenGroups.flat(),
      }),
    );
  }
  const tokensByChainId = addCounterparts({
    chains,
    tokensByChainId: builtTokens,
    curatedTokenGroups,
  });

  const files = new Map<string, ChainFile | PairFile | TopFile | IndexFile>();

  for (const chain of chains) {
    const file = `chains/${chain.chainId}.json`;
    const tokens = tokensByChainId.get(chain.chainId) ?? [];
    const published = await fetchPublished<ChainFile>(file);
    checkShrink({
      file,
      count: tokens.length,
      publishedCount: published?.tokens.length,
    });
    files.set(file, {
      version: REGISTRY_VERSION,
      generatedAt,
      chainId: chain.chainId,
      parentChainId: chain.parentChainId,
      tokens,
    });
  }

  const pairs = getRegistryPairs(chains, lifiChainIds);
  const lifiPairKeys = new Set<string>();
  const lifiConnectedAddressesByChainId = new Map<number, Set<string>>();
  const addLifiConnectedAddresses = (chainId: number, addresses: string[]) => {
    const connected = lifiConnectedAddressesByChainId.get(chainId) ?? new Set();
    addresses.forEach((address) => connected.add(address));
    lifiConnectedAddressesByChainId.set(chainId, connected);
  };
  for (const pair of pairs) {
    const file = `pairs/${pairKey(pair)}.json`;
    const hasLifi = isLifiPair(pair, lifiChainIds);
    const connection = hasLifi ? await fetchLifiConnection(pair) : null;
    const lifi = connection
      ? {
          fromTokens: keepListedTokens(
            connection.fromTokens,
            lifiAddressesByChainId.get(pair.sourceChainId),
          ),
          toTokens: keepListedTokens(
            connection.toTokens,
            lifiAddressesByChainId.get(pair.destinationChainId),
          ),
        }
      : undefined;
    if (lifi) {
      lifiPairKeys.add(pairKey(pair));
      addLifiConnectedAddresses(pair.sourceChainId, lifi.fromTokens);
      addLifiConnectedAddresses(pair.destinationChainId, lifi.toTokens);
    }

    // A pair can lose LiFi when the bridge UI stops offering it, and drop to 0
    // tokens.
    if (hasLifi) {
      const published = await fetchPublished<PairFile>(file);
      checkShrink({
        file,
        count: countPairTokens(lifi),
        publishedCount: published && countPairTokens(published.lifi),
      });
    }
    files.set(file, {
      version: REGISTRY_VERSION,
      generatedAt,
      ...pair,
      lifi,
    });
  }

  const topTokens = buildTopTokens({
    chains,
    tokensByChainId,
    lifiTokensByChainId,
    curatedTokenGroups,
  });
  const publishedTop = await fetchPublished<TopFile>('top.json');
  checkShrink({
    file: 'top.json',
    count: topTokens.length,
    publishedCount: publishedTop?.tokens.length,
  });
  files.set('top.json', {
    version: REGISTRY_VERSION,
    generatedAt,
    tokens: topTokens,
  });

  files.set('index.json', {
    version: REGISTRY_VERSION,
    generatedAt,
    chains: chains.map(({ tokenListUrls: _tokenListUrls, ...chain }) => chain),
    pairs,
  });

  const v2Files = toV2Files({
    files,
    lifiAddressesByChainId: lifiConnectedAddressesByChainId,
    lifiPairKeys,
  });

  // Nothing is written until every file passed its checks.
  for (const [version, versionFiles] of [
    ['v1', files],
    ['v2', v2Files],
  ] as const) {
    for (const [file, content] of versionFiles) {
      const filePath = path.join(outputDir, version, file);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(content));
    }
  }
  console.log(`Token registry generated at ${outputDir}`);
}
