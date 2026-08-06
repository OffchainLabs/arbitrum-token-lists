import { TokenList } from '@uniswap/token-lists';

import {
  arbListtoEtherscanList,
  mergeInputTokenLists,
} from '../../src/lib/token_list_gen';
import arblist from './schema/arbify.tokenlist.json';

const tokenList = (name: string, tokens: TokenList['tokens']): TokenList => ({
  name,
  timestamp: '2026-01-01T00:00:00.000Z',
  version: { major: 1, minor: 0, patch: 0 },
  tokens,
});

describe('token_list_gen Test', () => {
  describe('arbListtoEtherscanList test', () => {
    it('Should return etherscanlist when use correct arblist', () => {
      expect(() => {
        arbListtoEtherscanList(arblist);
      }).not.toThrow(Error);
    });
  });

  describe('mergeInputTokenLists', () => {
    it('deduplicates by chain and address with first-source precedence', () => {
      const address = '0x111111111111111111111111111111111111111a';
      const first = tokenList('Uniswap', [
        {
          chainId: 1,
          address,
          name: 'First source token',
          symbol: 'FIRST',
          decimals: 18,
        },
      ]);
      const second = tokenList('CoinGecko', [
        {
          chainId: 1,
          address: address.toUpperCase(),
          name: 'Duplicate token',
          symbol: 'DUP',
          decimals: 18,
        },
        {
          chainId: 42161,
          address,
          name: 'Same address on another chain',
          symbol: 'OTHER',
          decimals: 18,
        },
      ]);

      const merged = mergeInputTokenLists([first, second]);

      expect(merged.name).toBe('Uniswap');
      expect(merged.tokens).toHaveLength(2);
      expect(merged.tokens[0].name).toBe('First source token');
      expect(merged.tokens[1].name).toBe('Same address on another chain');
    });
  });
});
