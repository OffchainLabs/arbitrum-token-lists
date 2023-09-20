import { ArbTokenInfo, ArbTokenList } from '../../src/lib/types';

const common = {
  name: 'Arbed Uniswap',
  timestamp: '2023-01-17T13:21:35.005Z',
  version: {
    major: 2,
    minor: 3,
    patch: 4,
  },
};

type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type Mock = ArbTokenList & {
  tokens: Mutable<ArbTokenList['tokens']>;
};
export function baseList(): Mock {
  return {
    ...common,
    tokens: [
      {
        chainId: 42161,
        address: '0x6314C31A7a1652cE482cffe247E9CB7c3f4BB9aF',
        name: '1INCH Token',
        symbol: '1INCH',
        decimals: 18,
        logoURI:
          'https://assets.coingecko.com/coins/images/13469/thumb/1inch-token.png?1608803028',
        extensions: {
          bridgeInfo: {
            '1': {
              tokenAddress: '0x111111111117dc0aa78b770fa6a738034120c302',
              originBridgeAddress: '0x09e9222E96E7B4AE2a407B98d48e330053351EEe',
              destBridgeAddress: '0xa3a7b6f88361f48403514059f1f16c8e78d60eec',
            },
          },
        },
      },
      {
        chainId: 42161,
        address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
        name: 'Aave Token',
        symbol: 'AAVE',
        decimals: 18,
        logoURI:
          'https://assets.coingecko.com/coins/images/12645/thumb/AAVE.png?1601374110',
        extensions: {
          bridgeInfo: {
            '1': {
              tokenAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
              originBridgeAddress: '0x09e9222E96E7B4AE2a407B98d48e330053351EEe',
              destBridgeAddress: '0xa3a7b6f88361f48403514059f1f16c8e78d60eec',
            },
          },
        },
      },
      {
        chainId: 42161,
        address: '0xeC76E8fe6e2242e6c2117caA244B9e2DE1569923',
        name: 'AIOZ Network',
        symbol: 'AIOZ',
        decimals: 18,
        logoURI:
          'https://assets.coingecko.com/coins/images/14631/thumb/aioz_logo.png?1617413126',
        extensions: {
          bridgeInfo: {
            '1': {
              tokenAddress: '0x626e8036deb333b408be468f951bdb42433cbf18',
              originBridgeAddress: '0x09e9222E96E7B4AE2a407B98d48e330053351EEe',
              destBridgeAddress: '0xa3a7b6f88361f48403514059f1f16c8e78d60eec',
            },
          },
        },
      },
    ],
  };
}

export function withoutExtensions(tokens: ArbTokenInfo[]) {
  tokens.forEach((token) => {
    delete token.extensions;
  });

  return tokens;
}

export function patchList() {
  const prevList = baseList();
  const newList = baseList();

  newList.tokens[0].extensions!.bridgeInfo[1].tokenAddress =
    'different token address';
  return [prevList, newList.tokens] as const;
}

export function minorList() {
  const prevList = baseList();
  const newList = baseList();

  delete prevList.tokens[2].extensions;
  newList.tokens[1].extensions!.bridgeInfo[1].tokenAddress =
    'different token address';

  // PrevList: [tokenWithExtension, tokenWithExtension, tokenWithoutExtension]
  // NewList: [tokenWithExtension, tokenWithUpdatedExtension, tokenWithExtension]
  return [prevList, newList.tokens] as const;
}

export function majorList() {
  const [prevList, newListTokens] = minorList();

  delete newListTokens[0].extensions;
  // PrevList: [tokenWithExtension, tokenWithExtension, tokenWithoutExtension]
  // NewList: [tokenWithoutExtension, tokenWithUpdatedExtension, tokenWithExtension]
  return [prevList, newListTokens] as const;
}
