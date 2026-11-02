import { ArbitrumNetwork } from '@arbitrum/sdk';
import { constants } from 'ethers';

import { ChainPair, RegistryChain } from './types';

const TOKEN_LISTS_URL = 'https://tokenlist.arbitrum.io/ArbTokenLists';
const ARBITRUM_TOKEN_TOKEN_LIST = `${TOKEN_LISTS_URL}/arbitrum_token_token_list.json`;

export const ETHEREUM_CHAIN_ID = 1;
const ARBITRUM_ONE_CHAIN_ID = 42161;
const ARBITRUM_NOVA_CHAIN_ID = 42170;

// The same lists as the bridge UI's BRIDGE_TOKEN_LISTS.
const coreChains: RegistryChain[] = [
  { chainId: ETHEREUM_CHAIN_ID, name: 'Ethereum', tokenListUrls: [] },
  {
    chainId: ARBITRUM_ONE_CHAIN_ID,
    name: 'Arbitrum One',
    parentChainId: ETHEREUM_CHAIN_ID,
    tokenListUrls: [
      ARBITRUM_TOKEN_TOKEN_LIST,
      `${TOKEN_LISTS_URL}/arbed_arb_whitelist_era.json`,
      `${TOKEN_LISTS_URL}/arbed_uniswap_labs_default.json`,
      `${TOKEN_LISTS_URL}/arbed_coingecko.json`,
      `${TOKEN_LISTS_URL}/arbed_coinmarketcap.json`,
    ],
  },
  {
    chainId: ARBITRUM_NOVA_CHAIN_ID,
    name: 'Arbitrum Nova',
    parentChainId: ETHEREUM_CHAIN_ID,
    tokenListUrls: [
      ARBITRUM_TOKEN_TOKEN_LIST,
      `${TOKEN_LISTS_URL}/42170_arbed_uniswap_labs_default.json`,
      `${TOKEN_LISTS_URL}/42170_arbed_coingecko.json`,
    ],
  },
];

// Custom gas token chains need a native token mapping that the registry does not build yet.
function usesEther(network: ArbitrumNetwork): boolean {
  return !network.nativeToken || network.nativeToken === constants.AddressZero;
}

function toOrbitChain(network: ArbitrumNetwork): RegistryChain {
  return {
    chainId: network.chainId,
    name: network.name,
    parentChainId: network.parentChainId,
    tokenListUrls: [
      ARBITRUM_TOKEN_TOKEN_LIST,
      `${TOKEN_LISTS_URL}/${network.chainId}_arbed.json`,
      ...(network.parentChainId === ARBITRUM_ONE_CHAIN_ID
        ? [`${TOKEN_LISTS_URL}/${network.chainId}_arbed_native_list.json`]
        : []),
    ],
  };
}

export function getRegistryChains(
  orbitNetworks: ArbitrumNetwork[],
): RegistryChain[] {
  const chains = [...coreChains];
  const chainIds = new Set(chains.map((chain) => chain.chainId));

  // An L3 is added once its parent chain is in, so this repeats until nothing changes.
  let remaining = orbitNetworks.filter(
    (network) =>
      !network.isTestnet && network.tokenBridge && usesEther(network),
  );
  let added = true;
  while (added) {
    added = false;
    for (const network of remaining) {
      if (chainIds.has(network.parentChainId)) {
        chains.push(toOrbitChain(network));
        chainIds.add(network.chainId);
        added = true;
      }
    }
    remaining = remaining.filter((network) => !chainIds.has(network.chainId));
  }

  return chains;
}

export function pairKey({ sourceChainId, destinationChainId }: ChainPair) {
  return `${sourceChainId}-${destinationChainId}`;
}

// Every parent and child chain, both ways, and every two chains that LiFi supports.
export function getRegistryPairs(
  chains: RegistryChain[],
  lifiChainIds: Set<number>,
): ChainPair[] {
  const pairs = new Map<string, ChainPair>();
  const add = (sourceChainId: number, destinationChainId: number) => {
    const pair = { sourceChainId, destinationChainId };
    pairs.set(pairKey(pair), pair);
  };

  for (const chain of chains) {
    if (chain.parentChainId !== undefined) {
      add(chain.parentChainId, chain.chainId);
      add(chain.chainId, chain.parentChainId);
    }
  }

  const lifiChains = chains.filter((chain) => lifiChainIds.has(chain.chainId));
  for (const source of lifiChains) {
    for (const destination of lifiChains) {
      if (source.chainId !== destination.chainId) {
        add(source.chainId, destination.chainId);
      }
    }
  }

  return [...pairs.values()];
}
