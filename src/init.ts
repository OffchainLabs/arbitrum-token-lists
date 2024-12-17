import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { customNetworks } from './customNetworks';
import { addCustomNetwork, L1Network, getL1Network } from '@arbitrum/sdk';

const holesky: L1Network = {
  chainID: 17_000,
  name: 'holesky',
  explorerUrl: 'https://holesky.etherscan.io/',
  isCustom: true,
  blockTime: 12,
  partnerChainIDs: [],
  isArbitrum: false,
};

const base: L1Network = {
  chainID: 8453,
  name: 'base',
  explorerUrl: 'https://basescan.org/',
  isCustom: true,
  blockTime: 2,
  partnerChainIDs: [],
  isArbitrum: false,
};

const baseSepolia: L1Network = {
  chainID: 84532,
  name: 'base sepolia',
  explorerUrl: 'https://sepolia.basescan.org/',
  isCustom: true,
  blockTime: 2,
  partnerChainIDs: [],
  isArbitrum: false,
};

const unregisteredParentChains = {
  [holesky.chainID]: holesky,
  [base.chainID]: base,
  [baseSepolia.chainID]: baseSepolia,
};

async function registerCustomNetworks() {
  for (const network of Object.values(customNetworks)) {
    if (
      ![base.chainID, baseSepolia.chainID, holesky.chainID].includes(
        network.partnerChainID,
      )
    ) {
      addCustomNetwork({
        customL2Network: network,
      });
      continue;
    }

    // If parent chain is not registered (base, baseSepolia, holesky, ...)
    let isRegistered = false;
    try {
      await getL1Network(network.partnerChainID);
      isRegistered = true;
    } catch (e) {}

    addCustomNetwork({
      customL2Network: network,
      ...(!isRegistered
        ? {
            customL1Network: unregisteredParentChains[network.partnerChainID],
          }
        : {}),
    });
  }
}

(async () => {
  await registerCustomNetworks();
})();

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
