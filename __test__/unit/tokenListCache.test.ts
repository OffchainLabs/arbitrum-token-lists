import { extractCacheFromTokenList } from '../../src/lib/tokenListCache';
import { ArbTokenList } from '../../src/lib/types';

describe('tokenListCache', () => {
  describe('extractCacheFromTokenList', () => {
    it('should extract metadata from token list', () => {
      const mockTokenList: ArbTokenList = {
        name: 'Test List',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42161,
            address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
            name: 'Arbitrum',
            symbol: 'ARB',
            decimals: 18,
          },
          {
            chainId: 42161,
            address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
            name: 'Bridged USDC',
            symbol: 'USDC.e',
            decimals: 6,
          },
        ],
      };

      const cache = extractCacheFromTokenList(mockTokenList);

      // Verify metadata was cached (addresses should be lowercased)
      expect(
        cache.metadataCache['42161:0x912ce59144191c1204e64559fe8253a0e49e6548'],
      ).toEqual({
        name: 'Arbitrum',
        symbol: 'ARB',
        decimals: 18,
      });
      expect(
        cache.metadataCache['42161:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
      ).toEqual({
        name: 'Bridged USDC',
        symbol: 'USDC.e',
        decimals: 6,
      });

      expect(Object.keys(cache.metadataCache).length).toBe(2);
    });

    it('should extract permit tags from token list', () => {
      const mockTokenList: ArbTokenList = {
        name: 'Test List',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42161,
            address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
            name: 'Arbitrum',
            symbol: 'ARB',
            decimals: 18,
            tags: ['Standard Permit', 'bridged'],
          },
          {
            chainId: 42161,
            address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
            name: 'Bridged USDC',
            symbol: 'USDC.e',
            decimals: 6,
            tags: ['No Permit Enabled'],
          },
        ],
      };

      const cache = extractCacheFromTokenList(mockTokenList);

      // Verify permit tags were extracted
      expect(
        cache.permitCache['42161:0x912ce59144191c1204e64559fe8253a0e49e6548'],
      ).toBe('Standard Permit');
      expect(
        cache.permitCache['42161:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
      ).toBe('No Permit Enabled');

      expect(Object.keys(cache.permitCache).length).toBe(2);
    });

    it('should normalize addresses to lowercase in cache keys', () => {
      const mockTokenList: ArbTokenList = {
        name: 'Test List',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42161,
            address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12', // Mixed case
            name: 'Test Token',
            symbol: 'TEST',
            decimals: 18,
          },
        ],
      };

      const cache = extractCacheFromTokenList(mockTokenList);

      // Verify address is lowercased in cache key
      expect(
        cache.metadataCache['42161:0xabcdef1234567890abcdef1234567890abcdef12'],
      ).toBeDefined();
      expect(
        cache.metadataCache['42161:0xABCDEF1234567890ABCDEF1234567890ABCDEF12'],
      ).toBeUndefined();
    });

    it('should skip tokens without metadata', () => {
      const mockTokenList: ArbTokenList = {
        name: 'Test List',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42161,
            address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
            name: 'Valid Token',
            symbol: 'VALID',
            decimals: 18,
          },
          {
            chainId: 42161,
            address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          } as any,
        ],
      };

      const cache = extractCacheFromTokenList(mockTokenList);

      // Only valid token should be cached
      expect(Object.keys(cache.metadataCache).length).toBe(1);
      expect(
        cache.metadataCache['42161:0x912ce59144191c1204e64559fe8253a0e49e6548'],
      ).toBeDefined();
    });
  });

  describe('Cache key format validation', () => {
    it('should use format "chainId:lowercaseAddress"', () => {
      const mockTokenList: ArbTokenList = {
        name: 'Test List',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42161,
            address: '0x912CE59144191C1204E64559FE8253A0E49E6548', // Mixed case
            name: 'Test',
            symbol: 'TEST',
            decimals: 18,
          },
        ],
      };

      const cache = extractCacheFromTokenList(mockTokenList);

      const expectedKey = '42161:0x912ce59144191c1204e64559fe8253a0e49e6548';
      expect(cache.metadataCache[expectedKey]).toBeDefined();
      expect(cache.metadataCache[expectedKey].symbol).toBe('TEST');
    });

    it('should handle different chainIds correctly', () => {
      const mockTokenList: ArbTokenList = {
        name: 'Test List',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42170, // Arbitrum Nova
            address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
            name: 'Nova Token',
            symbol: 'NOVA',
            decimals: 18,
          },
          {
            chainId: 421614, // Arbitrum Sepolia
            address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
            name: 'Sepolia Token',
            symbol: 'SEP',
            decimals: 6,
          },
        ],
      };

      const cache = extractCacheFromTokenList(mockTokenList);

      // Both chainIds should be in cache
      expect(
        cache.metadataCache['42170:0x912ce59144191c1204e64559fe8253a0e49e6548'],
      ).toBeDefined();
      expect(
        cache.metadataCache[
          '421614:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'
        ],
      ).toBeDefined();
    });
  });

  describe('Tag extraction', () => {
    it('should extract only permit-related tags', () => {
      const mockTokenList: ArbTokenList = {
        name: 'Test List',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42161,
            address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
            name: 'Test',
            symbol: 'TEST',
            decimals: 18,
            tags: ['bridged', 'erc20', 'verified'], // No permit tags
          },
        ],
      };

      const cache = extractCacheFromTokenList(mockTokenList);

      // No permit tags should be cached
      expect(Object.keys(cache.permitCache).length).toBe(0);
      // But metadata should still be cached
      expect(Object.keys(cache.metadataCache).length).toBe(1);
    });

    it('should extract permit tag when present', () => {
      const mockTokenList: ArbTokenList = {
        name: 'Test List',
        timestamp: '2025-01-01T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42161,
            address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
            name: 'Test',
            symbol: 'TEST',
            decimals: 18,
            tags: ['bridged', 'Dai-Like Sig/Permit', 'verified'],
          },
        ],
      };

      const cache = extractCacheFromTokenList(mockTokenList);

      expect(
        cache.permitCache['42161:0x912ce59144191c1204e64559fe8253a0e49e6548'],
      ).toBe('Dai-Like Sig/Permit');
    });
  });
});
