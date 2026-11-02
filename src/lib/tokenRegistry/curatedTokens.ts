import { CuratedToken } from './types';

const ETHEREUM = 1;
const ARBITRUM_ONE = 42161;
const ROBINHOOD = 4663;

// Tokens that are the same asset on each chain of their group, even though bridgeInfo does not
// link them: natively issued tokens, or a token whose canonical bridged version is not the one
// users expect. On these chains the group wins over bridgeInfo and LiFi coinKeys.
export const curatedTokenGroups: CuratedToken[][] = [
  [
    {
      chainId: ETHEREUM,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    // Native USDC. bridgeInfo links Ethereum USDC to USDC.e.
    {
      chainId: ARBITRUM_ONE,
      address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    {
      chainId: ROBINHOOD,
      address: '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
  ],
  [
    {
      chainId: ETHEREUM,
      address: '0xe343167631d89b6ffc58b88d6b7fb0228795491d',
      symbol: 'USDG',
      name: 'Global Dollar',
      decimals: 6,
    },
    {
      chainId: ARBITRUM_ONE,
      address: '0x004b506865409877c9fa29bfb1eba929984b9bbc',
      symbol: 'USDG',
      name: 'Global Dollar',
      decimals: 6,
    },
    {
      chainId: ROBINHOOD,
      address: '0x5fc5360d0400a0fd4f2af552add042d716f1d168',
      symbol: 'USDG',
      name: 'Global Dollar',
      decimals: 6,
    },
  ],
  [
    {
      chainId: ETHEREUM,
      address: '0x6c3ea9036406852006290770bedfcaba0e23a0e8',
      symbol: 'PYUSD',
      name: 'PayPal USD',
      decimals: 6,
    },
    // PYUSD's own Arbitrum One deployment, not the canonical bridged PYUSD.
    {
      chainId: ARBITRUM_ONE,
      address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
      symbol: 'PYUSD',
      name: 'PayPal USD',
      decimals: 6,
    },
  ],
  [
    {
      chainId: ETHEREUM,
      address: '0x57e114b691db790c35207b2e685d4a43181e6061',
      symbol: 'ENA',
      name: 'ENA',
      decimals: 18,
    },
    // The ENA OFT, not the canonical bridged ENA.
    {
      chainId: ARBITRUM_ONE,
      address: '0x58538e6a46e07434d7e7375bc268d3cb839c0133',
      symbol: 'ENA',
      name: 'ENA',
      decimals: 18,
    },
  ],
];
