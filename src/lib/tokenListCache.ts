import axios from 'axios';
import { ArbTokenList } from './types';

export interface PermitCache {
  [key: string]: string;
}

export interface MetadataCache {
  [key: string]: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface CacheData {
  permitCache: PermitCache;
  metadataCache: MetadataCache;
}

const PUBLIC_TOKEN_LIST_BASE_URL =
  'https://tokenlist.arbitrum.io/ArbTokenLists';

/**
 * Fetches the public token list from S3 and extracts cache data.
 */
export async function loadCacheFromPublicURL(
  listUrl: string,
): Promise<CacheData> {
  const permitCache: PermitCache = {};
  const metadataCache: MetadataCache = {};

  try {
    console.log(`Fetching cache from public token list: ${listUrl}`);
    const response = await axios.get<ArbTokenList>(listUrl, { timeout: 10000 });
    const tokenList = response.data;

    if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
      console.log('No tokens found in public list');
      return { permitCache, metadataCache };
    }

    let tokensWithPermit = 0;
    let tokensWithMetadata = 0;

    for (const token of tokenList.tokens) {
      const cacheKey = `${token.chainId}:${token.address.toLowerCase()}`;

      // Extract permit tag if present
      if (token.tags && Array.isArray(token.tags)) {
        const permitTag = token.tags.find(
          (tag: string) => tag.includes('Permit') || tag.includes('permit'),
        );
        if (permitTag) {
          permitCache[cacheKey] = permitTag;
          tokensWithPermit++;
        }
      }

      // Extract metadata
      if (token.name && token.symbol && token.decimals !== undefined) {
        metadataCache[cacheKey] = {
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
        };
        tokensWithMetadata++;
      }
    }

    console.log(`Cache loaded from public S3 token list:`);
    console.log(`  - ${tokenList.tokens.length} total tokens scanned`);
    console.log(`  - ${tokensWithPermit} permit tags cached`);
    console.log(`  - ${tokensWithMetadata} metadata entries cached`);

    return { permitCache, metadataCache };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(
        'Public token list not found (first-time generation) - starting with empty cache',
      );
    } else {
      console.warn(
        'Failed to fetch public token list, falling back to local scan:',
        error,
      );
    }
    return { permitCache, metadataCache };
  }
}


/**
 * Gets the public URL for a token list based on chainId.
 */
function getPublicTokenListURL(chainId: number): string | null {
  const chainIdToListName: Record<number, string> = {
    42161: 'arbed_uniswap_labs.json',
    42170: '42170_arbed_uniswap_labs.json',
    421614: '421614_arbed_uniswap_labs.json',
  };

  const fileName = chainIdToListName[chainId];
  if (!fileName) {
    return null;
  }

  return `${PUBLIC_TOKEN_LIST_BASE_URL}/${fileName}`;
}

/**
 * Loads cache from S3. Fetches the latest production token list and extracts cached data.
 * No local caching - always fetches from S3 to ensure consistency across all environments.
 */
export async function loadCache(options?: {
  chainId?: number;
  publicListUrl?: string;
}): Promise<CacheData> {
  const publicUrl =
    options?.publicListUrl ||
    (options?.chainId ? getPublicTokenListURL(options.chainId) : null);

  if (!publicUrl) {
    console.log('No public URL available, starting with empty cache');
    return { permitCache: {}, metadataCache: {} };
  }

  return await loadCacheFromPublicURL(publicUrl);
}
