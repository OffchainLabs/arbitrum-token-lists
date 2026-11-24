import { pairKey } from './chains';
import {
  ChainFile,
  ChainFileV2,
  IndexFile,
  IndexFileV2,
  REGISTRY_V2_VERSION,
  TopFile,
  TopFileV2,
} from './types';

// The version 1 files in the version 2 format: the chain files and top.json flag
// the tokens LiFi routes, the index flags the LiFi pairs, and the pair files are
// dropped. The other files are copied.
export function toV2Files({
  files,
  lifiAddressesByChainId,
  lifiPairKeys,
}: {
  files: Map<string, { version: number }>;
  // The tokens of the chain that LiFi connects on its pairs, either way.
  lifiAddressesByChainId: Map<number, Set<string>>;
  lifiPairKeys: Set<string>;
}): Map<string, { version: number }> {
  const v2Files = new Map<string, { version: number }>();
  for (const [file, content] of files) {
    if (file.startsWith('pairs/')) {
      continue;
    }
    if (file.startsWith('chains/')) {
      const chainFile = content as ChainFile;
      const lifiAddresses = lifiAddressesByChainId.get(chainFile.chainId);
      const v2ChainFile: ChainFileV2 = {
        ...chainFile,
        version: REGISTRY_V2_VERSION,
        tokens: chainFile.tokens.map((token) =>
          lifiAddresses?.has(token.address)
            ? { ...token, isLifi: true }
            : token,
        ),
      };
      v2Files.set(file, v2ChainFile);
      continue;
    }
    if (file === 'top.json') {
      const top = content as TopFile;
      const v2Top: TopFileV2 = {
        ...top,
        version: REGISTRY_V2_VERSION,
        tokens: top.tokens.map((token) =>
          lifiAddressesByChainId.get(token.chainId)?.has(token.address)
            ? { ...token, isLifi: true }
            : token,
        ),
      };
      v2Files.set(file, v2Top);
      continue;
    }
    if (file === 'index.json') {
      const index = content as IndexFile;
      const v2Index: IndexFileV2 = {
        ...index,
        version: REGISTRY_V2_VERSION,
        pairs: index.pairs.map((pair) =>
          lifiPairKeys.has(pairKey(pair)) ? { ...pair, hasLifi: true } : pair,
        ),
      };
      v2Files.set(file, v2Index);
      continue;
    }
    v2Files.set(file, { ...content, version: REGISTRY_V2_VERSION });
  }
  return v2Files;
}

// Next caches a fetched file only up to 2 MiB, and stores it in base64, which is a third larger.
export const MAX_CHAIN_FILE_BYTES = 1.25 * 1024 * 1024;

// Splits each chain file over the limit into parts of at most the limit, each a chain file with
// some of the tokens, and lists the parts in the index. The parts replace the whole file.
export function splitChainFiles(
  files: Map<string, { version: number }>,
  maxBytes = MAX_CHAIN_FILE_BYTES,
): Map<string, { version: number }> {
  const split = new Map(files);
  const partsByChainId = new Map<number, string[]>();
  for (const [file, content] of files) {
    if (!file.startsWith('chains/') || byteLength(content) <= maxBytes) {
      continue;
    }
    const chainFile = content as ChainFileV2;
    const parts = splitTokens(chainFile, maxBytes);
    split.delete(file);
    const names = parts.map(
      (part, index) => `chains/${chainFile.chainId}-${index + 1}.json`,
    );
    parts.forEach((part, index) => split.set(names[index], part));
    partsByChainId.set(chainFile.chainId, names);
  }

  const index = split.get('index.json') as IndexFileV2 | undefined;
  if (index && partsByChainId.size > 0) {
    const splitIndex: IndexFileV2 = {
      ...index,
      chains: index.chains.map((chain) => {
        const names = partsByChainId.get(chain.chainId);
        return names ? { ...chain, files: names } : chain;
      }),
    };
    split.set('index.json', splitIndex);
  }
  return split;
}

function byteLength(content: unknown): number {
  return Buffer.byteLength(JSON.stringify(content));
}

// The fewest parts of equal token counts that each fit the limit.
function splitTokens(file: ChainFileV2, maxBytes: number): ChainFileV2[] {
  for (
    let count = Math.ceil(byteLength(file) / maxBytes);
    count <= file.tokens.length;
    count++
  ) {
    const size = Math.ceil(file.tokens.length / count);
    const parts = Array.from({ length: count }, (_, index) => ({
      ...file,
      tokens: file.tokens.slice(index * size, (index + 1) * size),
    })).filter((part) => part.tokens.length > 0);
    if (parts.every((part) => byteLength(part) <= maxBytes)) {
      return parts;
    }
  }
  throw new Error(`chains/${file.chainId}.json does not fit in parts`);
}
