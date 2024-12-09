import { L2Network } from '@arbitrum/sdk';
import { customNetworks } from '../../src/customNetworks';
import { fetchNewOrbitChains } from './fetchNewOrbitChains';

type Command = {
  name: string;
  paths: string[];
  version: boolean;
  command: string;
};

const arbitrumCommands: Command[] = [
  // Arb1
  {
    name: 'Arb1 FullList',
    paths: ['ArbTokenLists/arbed_full.json'],
    version: false,
    command:
      'yarn fullList --l2NetworkID 42161 --newArbifiedList ./src/ArbTokenLists/arbed_full.json --skipValidation',
  },
  {
    name: 'Arb1 Arbify Uniswap',
    paths: [
      'ArbTokenLists/arbed_uniswap_labs.json',
      'ArbTokenLists/arbed_uniswap_labs_default.json',
    ],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42161 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs.json --tokenList https://tokens.uniswap.org --newArbifiedList ./src/ArbTokenLists/arbed_uniswap_labs.json && cp ./src/ArbTokenLists/arbed_uniswap_labs.json ./src/ArbTokenLists/arbed_uniswap_labs_default.json',
  },
  {
    name: 'Arb1 Arbify CMC',
    paths: ['ArbTokenLists/arbed_coinmarketcap.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42161 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json --tokenList https://api.coinmarketcap.com/data-api/v3/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/arbed_coinmarketcap.json',
  },
  {
    name: 'Arb1 Arbify CoinGecko',
    paths: ['ArbTokenLists/arbed_coingecko.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42161 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coingecko.json --tokenList https://tokens.coingecko.com/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/arbed_coingecko.json',
  },
  {
    name: 'Arb1 Update Whitelist',
    paths: ['ArbTokenLists/arbed_arb_whitelist_era.json'],
    version: true,
    command:
      'yarn update --l2NetworkID 42161 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json --tokenList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json --includeOldDataFields true --newArbifiedList ./src/ArbTokenLists/arbed_arb_whitelist_era.json',
  },
  // Arb Nova
  {
    name: 'ArbNova Arbify Uniswap',
    paths: [
      'ArbTokenLists/42170_arbed_uniswap_labs.json',
      'ArbTokenLists/42170_arbed_uniswap_labs_default.json',
    ],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42170 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json --newArbifiedList ./src/ArbTokenLists/42170_arbed_uniswap_labs.json --tokenList https://tokens.uniswap.org && cp ./src/ArbTokenLists/42170_arbed_uniswap_labs.json ./src/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
  },
  {
    name: 'ArbNova Arbify CMC',
    paths: ['ArbTokenLists/42170_arbed_coinmarketcap.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42170 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coinmarketcap.json --tokenList https://api.coinmarketcap.com/data-api/v3/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/42170_arbed_coinmarketcap.json',
  },
  {
    name: 'ArbNova Arbify CoinGecko',
    paths: ['ArbTokenLists/42170_arbed_coingecko.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42170 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coingecko.json --tokenList https://tokens.coingecko.com/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/42170_arbed_coingecko.json',
  },
  // ArbSepolia
  {
    name: 'ArbSepolia Arbify Uniswap',
    paths: ['ArbTokenLists/421614_arbed_uniswap_labs.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 421614 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_uniswap_labs.json --tokenList https://tokens.uniswap.org --newArbifiedList ./src/ArbTokenLists/421614_arbed_uniswap_labs.json',
  },
  {
    name: 'ArbSepolia Arbify CoinGecko',
    paths: ['ArbTokenLists/421614_arbed_coingecko.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 421614 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_coingecko.json  --tokenList https://tokens.coingecko.com/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/421614_arbed_coingecko.json',
  },
];

const orbitCommands: Command[] = [];

// When new orbit chains are added, we need to skip `prevArbifiedList` flag and add `--ignorePreviousList` flag
// By default, we require previous list
const firstTimeGeneration = process.env.FIRST_TIME_GENERATION ?? false;

let networks: L2Network[] = customNetworks;

// Fist time generation, only run generation on new lists
if (firstTimeGeneration) {
  (async () => {
    const newChainIds = await fetchNewOrbitChains();
    networks = newChainIds.map(
      (chainId) =>
        customNetworks.find((network) => network.chainID === chainId)!,
    );
  })();
}

function getPreviousListFlag(tokenListName: string) {
  return firstTimeGeneration
    ? '--ignorePreviousList'
    : `--prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/${tokenListName}`;
}

customNetworks.forEach(({ name, chainID, partnerChainID }) => {
  // For each L2, generate arbified list
  if (partnerChainID === 1 || partnerChainID === 11155111) {
    const previousListFlag = getPreviousListFlag(
      `https://tokenlist.arbitrum.io/ArbTokenLists/${chainID}_arbed_uniswap_labs.json`,
    );
    orbitCommands.push({
      name: `${name} Arbify Uniswap`,
      paths: [`ArbTokenLists/${chainID}_arbed_uniswap_labs.json`],
      version: true,
      command: `yarn arbify --l2NetworkID ${chainID} ${previousListFlag} --newArbifiedList ./src/ArbTokenLists/${chainID}_arbed_uniswap_labs.json --tokenList https://tokens.uniswap.org`,
    });
    return;
  }

  const uniswapPreviousListFlag = getPreviousListFlag(
    `https://tokenlist.arbitrum.io/ArbTokenLists/${chainID}_arbed_uniswap_labs.json`,
  );
  // For each L3, generate native and uniswap list
  orbitCommands.push({
    name: `${name} Arbify Uniswap`,
    paths: [`ArbTokenLists/${chainID}_arbed_uniswap_labs.json`],
    version: true,
    command: `yarn arbify --l2NetworkID ${chainID} ${uniswapPreviousListFlag} --tokenList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs.json --newArbifiedList ./src/ArbTokenLists/${chainID}_arbed_uniswap_labs.json`,
  });
  const nativePreviousListFlag = getPreviousListFlag(
    `https://tokenlist.arbitrum.io/ArbTokenLists/${chainID}_arbed_native_list.json`,
  );
  orbitCommands.push({
    name: `${name} Arbify L2 native list`,
    paths: [`ArbTokenLists/${chainID}_arbed_native_list.json`],
    version: true,
    command: `yarn arbify --l2NetworkID ${chainID} ${nativePreviousListFlag} --tokenList ./src/Assets/42161_arbitrum_native_token_list.json --newArbifiedList ./src/ArbTokenLists/${chainID}_arbed_native_list.json`,
  });
});

if (firstTimeGeneration) {
  const matrix: Record<'include', Command[]> = {
    include: orbitCommands,
  };

  console.log(JSON.stringify(matrix, null, 0));
} else {
  const matrix: Record<'include', Command[]> = {
    include: arbitrumCommands.concat(orbitCommands),
  };

  console.log(JSON.stringify(matrix, null, 0));
}