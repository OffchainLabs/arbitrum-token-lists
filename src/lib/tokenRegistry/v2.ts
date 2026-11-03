import { pairKey } from './chains';
import {
  ChainFile,
  ChainFileV2,
  IndexFile,
  IndexFileV2,
  REGISTRY_V2_VERSION,
} from './types';

// The version 1 files in the version 2 format: the chain files flag the tokens
// LiFi routes, the index flags the LiFi pairs, and the pair files are dropped.
// The other files are copied.
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
