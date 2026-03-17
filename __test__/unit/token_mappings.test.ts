import { ArbTokenInfo } from '../../src/lib/types';
import { buildTokenMappingFiles } from '../../src/lib/tokenMappings';

const token = (
  chainId: number,
  address: string,
  originChainId?: number,
  originAddress?: string,
): ArbTokenInfo => {
  const bridgeInfo =
    originChainId === undefined || originAddress === undefined
      ? undefined
      : {
          [originChainId]: {
            tokenAddress: originAddress,
            originBridgeAddress: '0x0000000000000000000000000000000000000001',
            destBridgeAddress: '0x0000000000000000000000000000000000000002',
          },
        };

  return {
    chainId,
    address,
    name: `Token ${address.slice(2, 6)}`,
    symbol: `T${address.slice(2, 5)}`,
    decimals: 18,
    ...(bridgeInfo ? { extensions: { bridgeInfo } } : {}),
  };
};

describe('token mappings', () => {
  it('maps tokens that share the same canonical bridge origin', () => {
    const listA = {
      tokens: [
        token(
          42161,
          '0x1000000000000000000000000000000000000001',
          1,
          '0x9000000000000000000000000000000000000001',
        ),
      ],
    };

    const listB = {
      tokens: [
        token(
          42170,
          '0x2000000000000000000000000000000000000001',
          1,
          '0x9000000000000000000000000000000000000001',
        ),
      ],
    };

    const mappings = buildTokenMappingFiles([listA, listB]);

    expect(mappings).toEqual([
      {
        fromChainId: 42161,
        toChainId: 42170,
        timestamp: expect.any(String),
        mappings: {
          '0x1000000000000000000000000000000000000001':
            '0x2000000000000000000000000000000000000001',
        },
      },
      {
        fromChainId: 42170,
        toChainId: 42161,
        timestamp: expect.any(String),
        mappings: {
          '0x2000000000000000000000000000000000000001':
            '0x1000000000000000000000000000000000000001',
        },
      },
    ]);
  });

  it('chooses a deterministic token when canonical duplicates exist on a chain', () => {
    const mappings = buildTokenMappingFiles([
      {
        tokens: [
          token(
            42161,
            '0x1000000000000000000000000000000000000001',
            1,
            '0x9000000000000000000000000000000000000002',
          ),
          token(
            42170,
            '0x2000000000000000000000000000000000000003',
            1,
            '0x9000000000000000000000000000000000000002',
          ),
        ],
      },
      {
        tokens: [
          token(
            42170,
            '0x2000000000000000000000000000000000000001',
            1,
            '0x9000000000000000000000000000000000000002',
          ),
        ],
      },
    ]);

    const arbToNova = mappings.find(
      (mapping) => mapping.fromChainId === 42161 && mapping.toChainId === 42170,
    );
    expect(arbToNova).toEqual({
      fromChainId: 42161,
      toChainId: 42170,
      timestamp: expect.any(String),
      mappings: {
        '0x1000000000000000000000000000000000000001':
          '0x2000000000000000000000000000000000000001',
      },
    });
  });

  it('excludes tokens that have no bridge identity', () => {
    const mappings = buildTokenMappingFiles([
      {
        tokens: [
          token(42161, '0x3000000000000000000000000000000000000001'),
          token(42170, '0x3000000000000000000000000000000000000002'),
        ],
      },
    ]);

    expect(mappings).toEqual([]);
  });

  it('maps an origin-chain token without bridge extensions when canonical key is known', () => {
    const mappings = buildTokenMappingFiles([
      {
        tokens: [
          token(1, '0x9000000000000000000000000000000000000004'),
          token(
            42161,
            '0x4000000000000000000000000000000000000001',
            1,
            '0x9000000000000000000000000000000000000004',
          ),
          token(
            42170,
            '0x4000000000000000000000000000000000000002',
            1,
            '0x9000000000000000000000000000000000000004',
          ),
        ],
      },
    ]);

    const l1ToArb = mappings.find(
      (mapping) => mapping.fromChainId === 1 && mapping.toChainId === 42161,
    );

    expect(l1ToArb).toEqual({
      fromChainId: 1,
      toChainId: 42161,
      timestamp: expect.any(String),
      mappings: {
        '0x9000000000000000000000000000000000000004':
          '0x4000000000000000000000000000000000000001',
      },
    });
  });

  it('generates all directed pair mappings for a token present on three chains', () => {
    const mappings = buildTokenMappingFiles([
      {
        tokens: [
          token(
            42161,
            '0x5000000000000000000000000000000000000001',
            1,
            '0x9000000000000000000000000000000000000005',
          ),
          token(
            42170,
            '0x5000000000000000000000000000000000000002',
            1,
            '0x9000000000000000000000000000000000000005',
          ),
          token(
            421614,
            '0x5000000000000000000000000000000000000003',
            1,
            '0x9000000000000000000000000000000000000005',
          ),
        ],
      },
    ]);

    const directedPairs = mappings.map(
      (mapping) => `${mapping.fromChainId}->${mapping.toChainId}`,
    );

    expect(directedPairs).toEqual([
      '42161->42170',
      '42161->421614',
      '42170->42161',
      '42170->421614',
      '421614->42161',
      '421614->42170',
    ]);
  });
});
