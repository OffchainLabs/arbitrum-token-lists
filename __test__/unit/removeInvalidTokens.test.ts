import { removeInvalidTokensFromList } from '../../src/lib/utils';
import { ArbTokenList } from '../../src/lib/types';

describe('removeInvalidTokensFromList - performance bug', () => {
  it('should remove token with name > 40 characters without hanging', () => {
    const listWithLongName: ArbTokenList = {
      name: 'Test List',
      timestamp: '2025-01-01T00:00:00.000Z',
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 42161,
          address: '0x1111111111111111111111111111111111111111',
          name: 'iShares Russell 2000 ETF (Ondo Tokenized ETF)', // 46 chars - INVALID
          symbol: 'TEST1',
          decimals: 18,
        },
        {
          chainId: 42161,
          address: '0x2222222222222222222222222222222222222222',
          name: 'Valid Token', // Valid
          symbol: 'TEST2',
          decimals: 18,
        },
      ],
    };

    const startTime = Date.now();
    const result = removeInvalidTokensFromList(listWithLongName);
    const duration = Date.now() - startTime;

    // Should complete quickly (not hang for 60+ seconds)
    expect(duration).toBeLessThan(5000); // 5 second max

    // Should remove the invalid token
    expect(result.tokens.length).toBe(1);
    expect(result.tokens[0].name).toBe('Valid Token');
    expect(result.tokens[0].symbol).toBe('TEST2');
  });

  it('should handle multiple tokens with one invalid at the beginning', () => {
    // This is the worst case - invalid token at index 0
    // Old implementation would validate 100+ times
    const tokens = [];

    // Add 1 invalid token at the start
    tokens.push({
      chainId: 42161,
      address: '0x1111111111111111111111111111111111111111',
      name: 'This name is way too long and exceeds the forty character limit', // 69 chars
      symbol: 'INVALID',
      decimals: 18,
    });

    // Add 100 valid tokens
    for (let i = 0; i < 100; i++) {
      tokens.push({
        chainId: 42161,
        address: `0x${i.toString().padStart(40, '0')}`,
        name: `Token ${i}`,
        symbol: `T${i}`,
        decimals: 18,
      });
    }

    const listWithManyTokens: ArbTokenList = {
      name: 'Test List',
      timestamp: '2025-01-01T00:00:00.000Z',
      version: { major: 1, minor: 0, patch: 0 },
      tokens,
    };

    const startTime = Date.now();
    const result = removeInvalidTokensFromList(listWithManyTokens);
    const duration = Date.now() - startTime;

    console.log(`Removed invalid token from 101-token list in ${duration}ms`);

    // Should complete in reasonable time (not 60+ seconds)
    expect(duration).toBeLessThan(10000); // 10 second max for 100 tokens

    // Should remove only the invalid token
    expect(result.tokens.length).toBe(100);
    expect(result.tokens.every((t) => t.symbol.startsWith('T'))).toBe(true);
  });

  it('should handle multiple invalid tokens', () => {
    const listWithMultipleInvalid: ArbTokenList = {
      name: 'Test List',
      timestamp: '2025-01-01T00:00:00.000Z',
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 42161,
          address: '0x1111111111111111111111111111111111111111',
          name: 'First invalid token name that is too long for schema validation', // 68 chars
          symbol: 'INV1',
          decimals: 18,
        },
        {
          chainId: 42161,
          address: '0x2222222222222222222222222222222222222222',
          name: 'Valid Token',
          symbol: 'VALID',
          decimals: 18,
        },
        {
          chainId: 42161,
          address: '0x3333333333333333333333333333333333333333',
          name: 'Second invalid token name that exceeds character limit also', // 63 chars
          symbol: 'INV2',
          decimals: 18,
        },
      ],
    };

    const result = removeInvalidTokensFromList(listWithMultipleInvalid);

    // Should remove both invalid tokens
    expect(result.tokens.length).toBe(1);
    expect(result.tokens[0].symbol).toBe('VALID');
  });
});
