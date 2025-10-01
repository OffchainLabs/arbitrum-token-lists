import axios from 'axios';
import { loadCache, loadCacheFromPublicURL } from '../../src/lib/tokenListCache';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('tokenListCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadCache from S3 URL', () => {
    it('should fetch token list from S3 and extract metadata', async () => {
      const mockTokenList = {
        name: 'Test List',
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

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42161 });

      // Verify S3 was fetched
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs.json',
        { timeout: 10000 },
      );

      // Verify metadata was cached (addresses should be lowercased)
      expect(cache.metadataCache['42161:0x912ce59144191c1204e64559fe8253a0e49e6548']).toEqual({
        name: 'Arbitrum',
        symbol: 'ARB',
        decimals: 18,
      });
      expect(cache.metadataCache['42161:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8']).toEqual({
        name: 'Bridged USDC',
        symbol: 'USDC.e',
        decimals: 6,
      });

      expect(Object.keys(cache.metadataCache).length).toBe(2);
    });

    it('should extract permit tags from S3 token list', async () => {
      const mockTokenList = {
        name: 'Test List',
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

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42161 });

      // Verify permit tags were extracted
      expect(cache.permitCache['42161:0x912ce59144191c1204e64559fe8253a0e49e6548']).toBe('Standard Permit');
      expect(cache.permitCache['42161:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8']).toBe('No Permit Enabled');

      expect(Object.keys(cache.permitCache).length).toBe(2);
    });

    it('should handle 404 from S3 gracefully (first-time generation)', async () => {
      const error404 = Object.assign(new Error('Not Found'), {
        response: { status: 404 },
        isAxiosError: true,
      });

      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(error404);

      const cache = await loadCache({ chainId: 42161 });

      // Should return empty cache without throwing
      expect(cache.metadataCache).toEqual({});
      expect(cache.permitCache).toEqual({});
    });

    it('should handle network timeout gracefully', async () => {
      const timeoutError = new Error('Timeout');
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const cache = await loadCache({ chainId: 42161 });

      // Should return empty cache without throwing
      expect(cache.metadataCache).toEqual({});
      expect(cache.permitCache).toEqual({});
    });

    it('should handle invalid JSON from S3 gracefully', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: 'invalid json' });

      const cache = await loadCache({ chainId: 42161 });

      // Should return empty cache without throwing
      expect(cache.metadataCache).toEqual({});
      expect(cache.permitCache).toEqual({});
    });

    it('should normalize addresses to lowercase in cache keys', async () => {
      const mockTokenList = {
        name: 'Test List',
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

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42161 });

      // Verify address is lowercased in cache key
      expect(cache.metadataCache['42161:0xabcdef1234567890abcdef1234567890abcdef12']).toBeDefined();
      expect(cache.metadataCache['42161:0xABCDEF1234567890ABCDEF1234567890ABCDEF12']).toBeUndefined();
    });

    it('should skip tokens without metadata', async () => {
      const mockTokenList = {
        name: 'Test List',
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
            // Missing name, symbol, decimals
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42161 });

      // Only valid token should be cached
      expect(Object.keys(cache.metadataCache).length).toBe(1);
      expect(cache.metadataCache['42161:0x912ce59144191c1204e64559fe8253a0e49e6548']).toBeDefined();
    });

    it('should construct correct S3 URL for different chainIds', async () => {
      // Test Arbitrum One
      mockedAxios.get.mockResolvedValueOnce({ data: { tokens: [] } });
      await loadCache({ chainId: 42161 });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs.json',
        { timeout: 10000 },
      );

      // Test Arbitrum Nova
      mockedAxios.get.mockResolvedValueOnce({ data: { tokens: [] } });
      await loadCache({ chainId: 42170 });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs.json',
        { timeout: 10000 },
      );

      // Test Arbitrum Sepolia
      mockedAxios.get.mockResolvedValueOnce({ data: { tokens: [] } });
      await loadCache({ chainId: 421614 });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_uniswap_labs.json',
        { timeout: 10000 },
      );
    });
  });


  describe('Cache key format validation', () => {
    it('should use format "chainId:lowercaseAddress"', async () => {
      const mockTokenList = {
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

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42161 });

      const expectedKey = '42161:0x912ce59144191c1204e64559fe8253a0e49e6548';
      expect(cache.metadataCache[expectedKey]).toBeDefined();
      expect(cache.metadataCache[expectedKey].symbol).toBe('TEST');
    });

    it('should handle different chainIds correctly', async () => {
      const mockTokenList = {
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

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42170 });

      // Both chainIds should be in cache
      expect(cache.metadataCache['42170:0x912ce59144191c1204e64559fe8253a0e49e6548']).toBeDefined();
      expect(cache.metadataCache['421614:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8']).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty token list from S3', async () => {
      const mockTokenList = {
        tokens: [],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42161 });

      expect(cache.metadataCache).toEqual({});
      expect(cache.permitCache).toEqual({});
    });

    it('should handle missing tokens array in response', async () => {
      const mockTokenList = {
        name: 'Test List',
        version: { major: 1, minor: 0, patch: 0 },
        // No tokens array
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42161 });

      expect(cache.metadataCache).toEqual({});
      expect(cache.permitCache).toEqual({});
    });

    it('should handle tokens with missing decimals', async () => {
      const mockTokenList = {
        tokens: [
          {
            chainId: 42161,
            address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
            name: 'Test',
            symbol: 'TEST',
            // Missing decimals
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42161 });

      // Should not cache token without decimals
      expect(Object.keys(cache.metadataCache).length).toBe(0);
    });

    it('should extract only permit-related tags', async () => {
      const mockTokenList = {
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

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      const cache = await loadCache({ chainId: 42161 });

      // No permit tags should be cached
      expect(Object.keys(cache.permitCache).length).toBe(0);
      // But metadata should still be cached
      expect(Object.keys(cache.metadataCache).length).toBe(1);
    });
  });

  describe('Custom public URL override', () => {
    it('should use custom URL when provided', async () => {
      const customUrl = 'https://custom.example.com/tokens.json';
      const mockTokenList = {
        tokens: [
          {
            chainId: 42161,
            address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
            name: 'Custom Token',
            symbol: 'CUSTOM',
            decimals: 18,
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockTokenList });

      await loadCache({ publicListUrl: customUrl });

      // Verify custom URL was used instead of default
      expect(mockedAxios.get).toHaveBeenCalledWith(customUrl, { timeout: 10000 });
    });
  });

  describe('No chainId provided', () => {
    it('should return empty cache when no chainId or URL provided', async () => {
      const cache = await loadCache({});

      expect(cache.permitCache).toEqual({});
      expect(cache.metadataCache).toEqual({});
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});
