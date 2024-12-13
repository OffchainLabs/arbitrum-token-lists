import { customNetworks } from '../../src/customNetworks';

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
      'npm run fullList --l2NetworkID 42161 --newArbifiedList ./src/ArbTokenLists/arbed_full.json --skipValidation',
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
    name: 'Arb1 Sepolia Arbify Uniswap',
    paths: ['ArbTokenLists/421614_arbed_uniswap_labs.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 421614 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_uniswap_labs.json --tokenList https://tokens.uniswap.org --newArbifiedList ./src/ArbTokenLists/421614_arbed_uniswap_labs.json',
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

async function addCommand({
  chainID,
  name,
  path,
  inputList,
}: {
  chainID: number;
  name: string;
  path: string;
  inputList: string;
}): Promise<Command> {
  const url = `https://tokenlist.arbitrum.io/${path}`;
  const requiresFirstTimeGeneration = await fetch(url)
    .then((response) => response.json())
    .then(() => false)
    .catch(() => true);

  const previousListFlag = requiresFirstTimeGeneration
    ? '--ignorePreviousList'
    : `--prevArbifiedList ${url}`;

  return {
    name,
    paths: [path],
    version: true,
    command: `yarn arbify --l2NetworkID ${chainID} ${previousListFlag} --tokenList ${inputList} --newArbifiedList ./src/${path}`,
  };
}

function getUniswapTokenListFromPartnerChainId(chainId: number) {
  return (
    {
      // L1
      1: 'https://tokens.uniswap.org',
      11155111: 'https://tokens.uniswap.org',
      17000: 'https://tokens.uniswap.org',
      // Arbitrum
      42161:
        'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs.json',
      42170:
        'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs.json',
      421614:
        'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_uniswap_labs.json',
      // Base
    }[chainId] ?? 'https://tokens.uniswap.org'
  );
}
const l1ChainIds = [1, 11155111, 17000]; // Mainnet, sepolia, holesky
(async () => {
  for (let { name, chainID, partnerChainID } of customNetworks) {
    const inputUniswapTokenList =
      getUniswapTokenListFromPartnerChainId(chainID);

    if (!inputUniswapTokenList) {
      throw new Error(
        `Uniswap token list on parent chain does'nt exist for ${name} (${chainID})`,
      );
    }

    orbitCommands.push(
      await addCommand({
        name: `${name} Arbify Uniswap`,
        chainID,
        path: `ArbTokenLists/${chainID}_arbed_uniswap_labs.json`,
        inputList: inputUniswapTokenList,
      }),
    );

    // For L3, generate arbified native token list
    if (!l1ChainIds.includes(partnerChainID)) {
      orbitCommands.push(
        await addCommand({
          name: `${name} Arbify L2 native list`,
          chainID,
          path: `ArbTokenLists/${chainID}_arbed_native_list.json`,
          inputList: './src/Assets/42161_arbitrum_native_token_list.json',
        }),
      );
    }
  }

  const matrix: Record<'include', Command[]> = {
    include: arbitrumCommands.concat(orbitCommands),
  };

  console.log(JSON.stringify(matrix, null, 0));
})();
