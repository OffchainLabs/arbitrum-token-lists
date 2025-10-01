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
 * Extracts cache data from an already-loaded token list.
 * This is more efficient than fetching from S3 since the list is already loaded.
 */
export function extractCacheFromTokenList(tokenList: ArbTokenList): CacheData {
  const permitCache: PermitCache = {};
  const metadataCache: MetadataCache = {};

  if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
    return { permitCache, metadataCache };
  }

  for (const token of tokenList.tokens) {
    const cacheKey = `${token.chainId}:${token.address.toLowerCase()}`;

    // Extract permit tag if present
    if (token.tags && Array.isArray(token.tags)) {
      const permitTag = token.tags.find(
        (tag: string) => tag.includes('Permit') || tag.includes('permit'),
      );
      if (permitTag) {
        permitCache[cacheKey] = permitTag;
      }
    }

    // Extract metadata
    if (token.name && token.symbol && token.decimals !== undefined) {
      metadataCache[cacheKey] = {
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
      };
    }
  }

  return { permitCache, metadataCache };
}
