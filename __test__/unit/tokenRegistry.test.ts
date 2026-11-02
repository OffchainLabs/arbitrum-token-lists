import { ArbitrumNetwork } from '@arbitrum/sdk';

import {
  CanonicalLink,
  NATIVE_TOKEN_ADDRESS,
  addCounterparts,
  buildChainTokens,
  getCanonicalLinks,
} from '../../src/lib/tokenRegistry/build';
import {
  getRegistryChains,
  getRegistryPairs,
} from '../../src/lib/tokenRegistry/chains';
import { checkShrink } from '../../src/lib/tokenRegistry/generate';
import { buildTopTokens } from '../../src/lib/tokenRegistry/top';
import {
  CuratedToken,
  RegistryChain,
  RegistryToken,
  TokenListEntry,
  TopToken,
} from '../../src/lib/tokenRegistry/types';
import { toV2Files } from '../../src/lib/tokenRegistry/v2';

const ETHEREUM = 1;
const ARBITRUM_ONE = 42161;
const ROBINHOOD = 4663;
const L3 = 3343;
const NATIVE_USDC_L3 = 3344;

const USDC_ETHEREUM = '0x00000000000000000000000000000000000000e1';
const USDC_E_ARBITRUM = '0x00000000000000000000000000000000000000a1';
const USDC_ARBITRUM = '0x00000000000000000000000000000000000000a2';
const USDC_ROBINHOOD = '0x00000000000000000000000000000000000000b1';
const USDC_E_L3 = '0x00000000000000000000000000000000000000c1';
const USDC_NATIVE_USDC_L3 = '0x00000000000000000000000000000000000000d1';
const DAI_ETHEREUM = '0x00000000000000000000000000000000000000e2';
const DAI_ARBITRUM = '0x00000000000000000000000000000000000000a3';
const WBTC_ETHEREUM = '0x00000000000000000000000000000000000000e3';
const WBTC_ARBITRUM = '0x00000000000000000000000000000000000000a4';
const WBTC_ARBITRUM_2 = '0x00000000000000000000000000000000000000a5';

function network(
  chainId: number,
  parentChainId: number,
  overrides: Partial<ArbitrumNetwork> = {},
): ArbitrumNetwork {
  return {
    chainId,
    parentChainId,
    name: `Chain ${chainId}`,
    isTestnet: false,
    tokenBridge: {},
    ...overrides,
  } as ArbitrumNetwork;
}

function listEntry(
  chainId: number,
  address: string,
  symbol: string,
  parent?: { chainId: number; address: string },
): TokenListEntry {
  return {
    chainId,
    address,
    symbol,
    name: symbol,
    decimals: 6,
    extensions: parent
      ? { bridgeInfo: { [parent.chainId]: { tokenAddress: parent.address } } }
      : undefined,
  };
}

const chains: RegistryChain[] = [
  { chainId: ETHEREUM, name: 'Ethereum', tokenListUrls: [] },
  {
    chainId: ARBITRUM_ONE,
    name: 'Arbitrum One',
    parentChainId: ETHEREUM,
    tokenListUrls: ['arb-one'],
  },
  {
    chainId: ROBINHOOD,
    name: 'Robinhood',
    parentChainId: ETHEREUM,
    tokenListUrls: ['robinhood'],
  },
  {
    chainId: L3,
    name: 'L3',
    parentChainId: ARBITRUM_ONE,
    tokenListUrls: ['l3'],
  },
  // Its USDC is bridged from native USDC, which only the curated group links to Ethereum.
  {
    chainId: NATIVE_USDC_L3,
    name: 'Native USDC L3',
    parentChainId: ARBITRUM_ONE,
    tokenListUrls: ['native-usdc-l3'],
  },
];

const listsByUrl = new Map<string, TokenListEntry[]>([
  [
    'arb-one',
    [
      listEntry(ARBITRUM_ONE, USDC_E_ARBITRUM, 'USDC.e', {
        chainId: ETHEREUM,
        address: USDC_ETHEREUM,
      }),
      listEntry(ARBITRUM_ONE, DAI_ARBITRUM, 'DAI', {
        chainId: ETHEREUM,
        address: DAI_ETHEREUM,
      }),
    ],
  ],
  [
    'robinhood',
    [
      listEntry(ROBINHOOD, USDC_ROBINHOOD, 'USDC', {
        chainId: ETHEREUM,
        address: USDC_ETHEREUM,
      }),
    ],
  ],
  [
    'l3',
    [
      listEntry(L3, USDC_E_L3, 'USDC.e', {
        chainId: ARBITRUM_ONE,
        address: USDC_E_ARBITRUM,
      }),
    ],
  ],
  [
    'native-usdc-l3',
    [
      listEntry(NATIVE_USDC_L3, USDC_NATIVE_USDC_L3, 'USDC', {
        chainId: ARBITRUM_ONE,
        address: USDC_ARBITRUM,
      }),
    ],
  ],
]);

const curatedTokenGroups: CuratedToken[][] = [
  [
    {
      chainId: ETHEREUM,
      address: USDC_ETHEREUM,
      symbol: 'USDC',
      name: 'USDC',
      decimals: 6,
    },
    {
      chainId: ARBITRUM_ONE,
      address: USDC_ARBITRUM,
      symbol: 'USDC',
      name: 'USDC',
      decimals: 6,
    },
    {
      chainId: ROBINHOOD,
      address: USDC_ROBINHOOD,
      symbol: 'USDC',
      name: 'USDC',
      decimals: 6,
    },
  ],
];

const lifiTokensByChainId = new Map([
  [
    ETHEREUM,
    [
      {
        address: NATIVE_TOKEN_ADDRESS,
        symbol: 'ETH',
        name: 'ETH',
        decimals: 18,
        coinKey: 'ETH',
      },
      {
        address: USDC_ETHEREUM,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        coinKey: 'USDC',
        logoURI: 'usdc.png',
      },
      {
        address: WBTC_ETHEREUM,
        symbol: 'WBTC',
        name: 'WBTC',
        decimals: 8,
        coinKey: 'WBTC',
      },
    ],
  ],
  [
    ARBITRUM_ONE,
    [
      {
        address: USDC_E_ARBITRUM,
        symbol: 'USDC.e',
        name: 'Bridged USDC',
        decimals: 6,
        coinKey: 'USDCe',
      },
      {
        address: WBTC_ARBITRUM,
        symbol: 'WBTC',
        name: 'WBTC',
        decimals: 8,
        coinKey: 'WBTC',
      },
    ],
  ],
]);

function buildAll(
  groups: CuratedToken[][] = curatedTokenGroups,
  lifiTokens = lifiTokensByChainId,
): Map<number, RegistryToken[]> {
  const links = getCanonicalLinks(chains, listsByUrl);
  const tokensByChainId = new Map(
    chains.map((chain) => [
      chain.chainId,
      buildChainTokens({
        chainId: chain.chainId,
        links,
        lifiTokens: lifiTokens.get(chain.chainId) ?? null,
        oftAddresses: new Set(chain.chainId === ETHEREUM ? [DAI_ETHEREUM] : []),
        curatedTokens: groups.flat(),
      }),
    ]),
  );
  return addCounterparts({
    chains,
    tokensByChainId,
    curatedTokenGroups: groups,
  });
}

function findToken(
  tokensByChainId: Map<number, RegistryToken[]>,
  chainId: number,
  address: string,
): RegistryToken | undefined {
  return tokensByChainId
    .get(chainId)
    ?.find((token) => token.address === address);
}

describe('Token registry', () => {
  describe('getRegistryChains', () => {
    it('adds the chains whose parent is in the registry, L3s included', () => {
      const registryChains = getRegistryChains([
        // The L3 comes before its parent on purpose.
        network(5000, 4000),
        network(4000, ARBITRUM_ONE),
        network(ROBINHOOD, ETHEREUM),
        network(6000, ETHEREUM, {
          nativeToken: '0x00000000000000000000000000000000000000Ff',
        }),
        network(7000, ETHEREUM, { isTestnet: true }),
        network(8000, 8453),
      ]);

      expect(registryChains.map((chain) => chain.chainId)).toEqual([
        ETHEREUM,
        ARBITRUM_ONE,
        42170,
        4000,
        ROBINHOOD,
        6000,
        5000,
      ]);
      expect(registryChains[5].nativeToken).toBe(
        '0x00000000000000000000000000000000000000ff',
      );
      expect(registryChains[3].nativeToken).toBeUndefined();
    });

    it('reads the native list of chains that settle on Arbitrum One', () => {
      const [, , , l3] = getRegistryChains([network(L3, ARBITRUM_ONE)]);
      expect(l3.tokenListUrls).toContain(
        `https://tokenlist.arbitrum.io/ArbTokenLists/${L3}_arbed_native_list.json`,
      );
    });
  });

  describe('getRegistryPairs', () => {
    it('pairs parent and child chains both ways, and the LiFi pairs the bridge UI offers', () => {
      const pairs = getRegistryPairs(
        chains,
        new Set([ETHEREUM, ARBITRUM_ONE, ROBINHOOD, L3]),
      );
      expect(
        pairs.map((pair) => `${pair.sourceChainId}-${pair.destinationChainId}`),
      ).toEqual([
        '1-42161',
        '42161-1',
        '1-4663',
        '4663-1',
        '42161-3343',
        '3343-42161',
        '42161-3344',
        '3344-42161',
        '42161-4663',
        '4663-42161',
      ]);
    });
  });

  describe('toV2Files', () => {
    const token = (address: string, symbol: string): RegistryToken => ({
      address,
      symbol,
      name: symbol,
      decimals: 6,
    });

    it('flags the LiFi tokens and pairs, drops the pair files and copies the others', () => {
      const generatedAt = '2026-01-01T00:00:00.000Z';
      const v2Files = toV2Files({
        files: new Map<string, { version: number } & Record<string, unknown>>([
          [
            `chains/${ETHEREUM}.json`,
            {
              version: 1,
              generatedAt,
              chainId: ETHEREUM,
              tokens: [
                token(USDC_ETHEREUM, 'USDC'),
                token(DAI_ETHEREUM, 'DAI'),
              ],
            },
          ],
          [
            `pairs/${ETHEREUM}-${ARBITRUM_ONE}.json`,
            {
              version: 1,
              generatedAt,
              sourceChainId: ETHEREUM,
              destinationChainId: ARBITRUM_ONE,
            },
          ],
          [
            'index.json',
            {
              version: 1,
              generatedAt,
              chains: [],
              pairs: [
                { sourceChainId: ETHEREUM, destinationChainId: ARBITRUM_ONE },
                { sourceChainId: ETHEREUM, destinationChainId: ROBINHOOD },
              ],
            },
          ],
          ['top.json', { version: 1, generatedAt, tokens: [] }],
        ]),
        lifiAddressesByChainId: new Map([[ETHEREUM, new Set([USDC_ETHEREUM])]]),
        lifiPairKeys: new Set([`${ETHEREUM}-${ARBITRUM_ONE}`]),
      });

      expect([...v2Files.keys()]).toEqual([
        `chains/${ETHEREUM}.json`,
        'index.json',
        'top.json',
      ]);
      expect(v2Files.get(`chains/${ETHEREUM}.json`)).toEqual({
        version: 2,
        generatedAt,
        chainId: ETHEREUM,
        tokens: [
          { ...token(USDC_ETHEREUM, 'USDC'), isLifi: true },
          token(DAI_ETHEREUM, 'DAI'),
        ],
      });
      expect(v2Files.get('index.json')).toEqual({
        version: 2,
        generatedAt,
        chains: [],
        pairs: [
          {
            sourceChainId: ETHEREUM,
            destinationChainId: ARBITRUM_ONE,
            hasLifi: true,
          },
          { sourceChainId: ETHEREUM, destinationChainId: ROBINHOOD },
        ],
      });
      expect(v2Files.get('top.json')).toEqual({
        version: 2,
        generatedAt,
        tokens: [],
      });
    });
  });

  describe('getCanonicalLinks', () => {
    it('keeps the first parent a child token gets', () => {
      const links = getCanonicalLinks(
        [chains[1]],
        new Map([
          [
            'arb-one',
            [
              listEntry(ARBITRUM_ONE, USDC_E_ARBITRUM, 'USDC.e', {
                chainId: ETHEREUM,
                address: USDC_ETHEREUM,
              }),
              listEntry(ARBITRUM_ONE, USDC_E_ARBITRUM, 'USDC.e', {
                chainId: ETHEREUM,
                address: DAI_ETHEREUM,
              }),
              listEntry(ROBINHOOD, USDC_ROBINHOOD, 'USDC', {
                chainId: ETHEREUM,
                address: USDC_ETHEREUM,
              }),
              listEntry(ARBITRUM_ONE, DAI_ARBITRUM, 'DAI'),
            ],
          ],
        ]),
      );

      expect(links).toHaveLength(1);
      expect(links[0].parentAddress).toBe(USDC_ETHEREUM);
    });
  });

  describe('buildChainTokens', () => {
    const tokensByChainId = buildAll();

    it('links child tokens to their parent', () => {
      expect(
        findToken(tokensByChainId, ARBITRUM_ONE, USDC_E_ARBITRUM)
          ?.parentAddress,
      ).toBe(USDC_ETHEREUM);
      expect(findToken(tokensByChainId, L3, USDC_E_L3)?.parentAddress).toBe(
        USDC_E_ARBITRUM,
      );
    });

    it('prefers curated metadata, then the source that describes the token', () => {
      expect(
        findToken(tokensByChainId, ARBITRUM_ONE, USDC_E_ARBITRUM),
      ).toMatchObject({
        name: 'USDC.e',
        coinKey: 'USDCe',
      });
      expect(findToken(tokensByChainId, ETHEREUM, USDC_ETHEREUM)).toMatchObject(
        {
          name: 'USDC',
          coinKey: 'USDC',
          logoURI: 'usdc.png',
        },
      );
    });

    it('flags OFTs', () => {
      expect(findToken(tokensByChainId, ETHEREUM, DAI_ETHEREUM)?.isOft).toBe(
        true,
      );
      expect(
        findToken(tokensByChainId, ETHEREUM, USDC_ETHEREUM)?.isOft,
      ).toBeUndefined();
    });

    it('adds the native token and curated tokens that no source lists', () => {
      expect(findToken(tokensByChainId, L3, NATIVE_TOKEN_ADDRESS)?.symbol).toBe(
        'ETH',
      );
      expect(
        findToken(tokensByChainId, ARBITRUM_ONE, USDC_ARBITRUM)?.symbol,
      ).toBe('USDC');
    });
  });

  describe('addCounterparts', () => {
    const tokensByChainId = buildAll();
    const counterparts = (chainId: number, address: string) =>
      findToken(tokensByChainId, chainId, address)?.counterparts;

    it('maps a curated token to its group, over bridgeInfo', () => {
      expect(counterparts(ETHEREUM, USDC_ETHEREUM)).toMatchObject({
        [ARBITRUM_ONE]: USDC_ARBITRUM,
        [ROBINHOOD]: USDC_ROBINHOOD,
        [L3]: USDC_E_L3,
      });
      expect(counterparts(ARBITRUM_ONE, USDC_ARBITRUM)).toMatchObject({
        [ETHEREUM]: USDC_ETHEREUM,
        [ROBINHOOD]: USDC_ROBINHOOD,
      });
    });

    it('maps USDC.e and native USDC to the same Ethereum USDC', () => {
      expect(counterparts(ARBITRUM_ONE, USDC_E_ARBITRUM)).toEqual({
        [ETHEREUM]: USDC_ETHEREUM,
        [ROBINHOOD]: USDC_ROBINHOOD,
        [L3]: USDC_E_L3,
        [NATIVE_USDC_L3]: USDC_NATIVE_USDC_L3,
      });
    });

    it('follows bridgeInfo through several chains, before the curated group', () => {
      expect(counterparts(L3, USDC_E_L3)).toEqual({
        [ETHEREUM]: USDC_ETHEREUM,
        [ARBITRUM_ONE]: USDC_E_ARBITRUM,
        [ROBINHOOD]: USDC_ROBINHOOD,
        [NATIVE_USDC_L3]: USDC_NATIVE_USDC_L3,
      });
    });

    it('reaches a curated group through bridgeInfo, both ways', () => {
      expect(counterparts(ETHEREUM, USDC_ETHEREUM)?.[NATIVE_USDC_L3]).toBe(
        USDC_NATIVE_USDC_L3,
      );
      expect(counterparts(NATIVE_USDC_L3, USDC_NATIVE_USDC_L3)).toEqual({
        [ETHEREUM]: USDC_ETHEREUM,
        [ARBITRUM_ONE]: USDC_ARBITRUM,
        [ROBINHOOD]: USDC_ROBINHOOD,
        [L3]: USDC_E_L3,
      });
    });

    it('falls back to the LiFi coinKey', () => {
      expect(counterparts(ETHEREUM, WBTC_ETHEREUM)).toEqual({
        [ARBITRUM_ONE]: WBTC_ARBITRUM,
      });
    });

    it('skips a coinKey that two tokens share on the target chain', () => {
      const lifiTokens = new Map(lifiTokensByChainId);
      lifiTokens.set(ARBITRUM_ONE, [
        ...(lifiTokensByChainId.get(ARBITRUM_ONE) ?? []),
        {
          address: WBTC_ARBITRUM_2,
          symbol: 'WBTC',
          name: 'WBTC',
          decimals: 8,
          coinKey: 'WBTC',
        },
      ]);
      const ambiguous = buildAll(curatedTokenGroups, lifiTokens);
      expect(
        findToken(ambiguous, ETHEREUM, WBTC_ETHEREUM)?.counterparts,
      ).toBeUndefined();
    });

    it('maps the native token to the native token', () => {
      expect(counterparts(ROBINHOOD, NATIVE_TOKEN_ADDRESS)).toEqual({
        [ETHEREUM]: NATIVE_TOKEN_ADDRESS,
        [ARBITRUM_ONE]: NATIVE_TOKEN_ADDRESS,
        [L3]: NATIVE_TOKEN_ADDRESS,
        [NATIVE_USDC_L3]: NATIVE_TOKEN_ADDRESS,
      });
    });
  });

  describe('custom gas tokens', () => {
    const APE_CHAIN = 33139;
    const APE_ETHEREUM = '0x00000000000000000000000000000000000000e4';
    const APE_ARBITRUM = '0x00000000000000000000000000000000000000a6';
    const gasChains: RegistryChain[] = [
      chains[0],
      chains[1],
      {
        chainId: APE_CHAIN,
        name: 'ApeChain',
        parentChainId: ARBITRUM_ONE,
        nativeToken: APE_ARBITRUM,
        tokenListUrls: [],
      },
    ];
    const links: CanonicalLink[] = [
      {
        childChainId: ARBITRUM_ONE,
        parentChainId: ETHEREUM,
        childAddress: APE_ARBITRUM,
        parentAddress: APE_ETHEREUM,
        symbol: 'APE',
        name: 'ApeCoin',
        decimals: 18,
      },
      // Not 18 decimals, to check that the native token keeps 18.
      {
        childChainId: APE_CHAIN,
        parentChainId: ARBITRUM_ONE,
        childAddress: NATIVE_TOKEN_ADDRESS,
        parentAddress: APE_ARBITRUM,
        symbol: 'APE',
        name: 'ApeCoin',
        decimals: 6,
      },
    ];
    const tokensByChainId = addCounterparts({
      chains: gasChains,
      tokensByChainId: new Map(
        gasChains.map((chain) => [
          chain.chainId,
          buildChainTokens({
            chainId: chain.chainId,
            links,
            lifiTokens: null,
            oftAddresses: new Set(),
            curatedTokens: [],
          }),
        ]),
      ),
      curatedTokenGroups: [],
    });

    it('names the native token after the gas token, with 18 decimals', () => {
      expect(
        findToken(tokensByChainId, APE_CHAIN, NATIVE_TOKEN_ADDRESS),
      ).toMatchObject({
        symbol: 'APE',
        name: 'ApeCoin',
        decimals: 18,
        parentAddress: APE_ARBITRUM,
      });
    });

    it('maps the gas token through its parent chains, and Ether only to Ether', () => {
      expect(
        findToken(tokensByChainId, APE_CHAIN, NATIVE_TOKEN_ADDRESS)
          ?.counterparts,
      ).toEqual({
        [ETHEREUM]: APE_ETHEREUM,
        [ARBITRUM_ONE]: APE_ARBITRUM,
      });
      expect(
        findToken(tokensByChainId, ARBITRUM_ONE, APE_ARBITRUM)?.counterparts,
      ).toEqual({
        [ETHEREUM]: APE_ETHEREUM,
        [APE_CHAIN]: NATIVE_TOKEN_ADDRESS,
      });
      expect(
        findToken(tokensByChainId, ARBITRUM_ONE, NATIVE_TOKEN_ADDRESS)
          ?.counterparts,
      ).toEqual({ [ETHEREUM]: NATIVE_TOKEN_ADDRESS });
    });
  });

  describe('checkShrink', () => {
    it('throws when a file lost more than 20% of its tokens', () => {
      expect(() =>
        checkShrink({ file: 'chains/1.json', count: 79, publishedCount: 100 }),
      ).toThrow(
        'chains/1.json has 79 tokens, down from 100 in the published version',
      );
    });

    it('accepts a smaller drop and a first generation', () => {
      expect(() =>
        checkShrink({ file: 'chains/1.json', count: 80, publishedCount: 100 }),
      ).not.toThrow();
      expect(() =>
        checkShrink({
          file: 'chains/1.json',
          count: 0,
          publishedCount: undefined,
        }),
      ).not.toThrow();
    });
  });

  describe('buildTopTokens', () => {
    const tokensByChainId = buildAll();
    const lifiTokensByChainId = new Map([
      [
        ETHEREUM,
        [
          {
            address: USDC_ETHEREUM,
            symbol: 'USDC',
            name: 'USDC',
            decimals: 6,
            volumeUSD24H: 100,
          },
          {
            address: WBTC_ETHEREUM,
            symbol: 'WBTC',
            name: 'WBTC',
            decimals: 8,
            volumeUSD24H: 30,
          },
        ],
      ],
      [
        ARBITRUM_ONE,
        [
          {
            address: WBTC_ARBITRUM,
            symbol: 'WBTC',
            name: 'WBTC',
            decimals: 8,
            volumeUSD24H: 50,
          },
          {
            address: USDC_E_ARBITRUM,
            symbol: 'USDC.e',
            name: 'USDC.e',
            decimals: 6,
            volumeUSD24H: null,
          },
        ],
      ],
    ]);
    const buildTop = (limit: number) =>
      buildTopTokens({
        chains,
        tokensByChainId,
        lifiTokensByChainId,
        curatedTokenGroups,
        limit,
      });
    const keys = (tokens: TopToken[]) =>
      tokens.map((token) => `${token.chainId}:${token.address}`);
    const nativeAndCurated = [
      `${ETHEREUM}:${NATIVE_TOKEN_ADDRESS}`,
      `${ARBITRUM_ONE}:${NATIVE_TOKEN_ADDRESS}`,
      `${ROBINHOOD}:${NATIVE_TOKEN_ADDRESS}`,
      `${L3}:${NATIVE_TOKEN_ADDRESS}`,
      `${NATIVE_USDC_L3}:${NATIVE_TOKEN_ADDRESS}`,
      `${ETHEREUM}:${USDC_ETHEREUM}`,
      `${ARBITRUM_ONE}:${USDC_ARBITRUM}`,
      `${ROBINHOOD}:${USDC_ROBINHOOD}`,
    ];

    it('puts native and curated tokens first, then ranks the rest by volume across chains', () => {
      const top = buildTop(100);
      expect(keys(top)).toEqual([
        ...nativeAndCurated,
        `${ARBITRUM_ONE}:${WBTC_ARBITRUM}`,
        `${ETHEREUM}:${WBTC_ETHEREUM}`,
      ]);
      expect(
        top.find((token) => token.address === USDC_ETHEREUM)?.volumeUSD24H,
      ).toBe(100);
    });

    it('stops at the limit, but keeps every native and curated token', () => {
      expect(keys(buildTop(9))).toEqual([
        ...nativeAndCurated,
        `${ARBITRUM_ONE}:${WBTC_ARBITRUM}`,
      ]);
      expect(keys(buildTop(2))).toEqual(nativeAndCurated);
    });
  });
});
