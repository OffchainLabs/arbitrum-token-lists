import { customNetworks } from '../../src/customNetworks';

export type Command = {
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

type OrbitNetwork = {
  name: string;
  chainId: number;
  parentChainId: number;
};

type FetchTokenList = (
  url: string,
) => Promise<{ json: () => Promise<unknown> }>;

async function addCommand({
  chainId,
  fetchTokenList,
  name,
  path,
  inputLists,
}: {
  chainId: number;
  fetchTokenList: FetchTokenList;
  name: string;
  path: string;
  inputLists: string[];
}): Promise<Command> {
  const url = `https://tokenlist.arbitrum.io/${path}`;
  const requiresFirstTimeGeneration = await fetchTokenList(url)
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
    command: `yarn arbify --l2NetworkID ${chainId} ${previousListFlag} --tokenList ${
      inputLists[0]
    } ${inputLists
      .slice(1)
      .map((inputList) => `--inputTokenList ${inputList}`)
      .join(' ')} --newArbifiedList ./src/${path}`,
  };
}

export async function createOrbitTokenListCommand(
  { chainId, name }: OrbitNetwork,
  inputLists: (string | undefined)[],
  fetchTokenList: FetchTokenList,
): Promise<Command> {
  const availableInputLists = inputLists.filter(
    (inputList): inputList is string => !!inputList,
  );

  if (availableInputLists.length === 0) {
    throw new Error(
      `Token lists on parent chain don't exist for ${name} (${chainId})`,
    );
  }

  return addCommand({
    name: `${name} Arbify token lists`,
    chainId,
    fetchTokenList,
    path: `ArbTokenLists/${chainId}_arbed.json`,
    inputLists: availableInputLists,
  });
}

function getUniswapTokenListFromParentChainId(chainId: number) {
  return {
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
    8453: 'https://tokenlist.arbitrum.io/ArbTokenLists/8453_uniswap_labs.json',
    84532:
      'https://tokenlist.arbitrum.io/ArbTokenLists/84532_uniswap_labs.json',
  }[chainId];
}

function getCoinGeckoTokenListFromParentChainId(chainId: number) {
  return {
    // L1
    1: 'https://tokens.coingecko.com/uniswap/all.json',
    11155111: 'https://tokens.coingecko.com/uniswap/all.json',
    17000: 'https://tokens.coingecko.com/uniswap/all.json',
    // Arbitrum
    42161: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coingecko.json',
    42170:
      'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coingecko.json',
    421614:
      'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_coingecko.json',
    // Base
    8453: 'https://tokens.coingecko.com/base/all.json',
    84532: 'https://tokens.coingecko.com/uniswap/all.json',
  }[chainId];
}

function getCMCTokenListFromParentChainId(chainId: number) {
  return {
    // L1
    1: 'https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
    11155111: 'https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
    17000: 'https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
    // Arbitrum
    42161:
      'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
    42170:
      'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coinmarketcap.json',
  }[chainId];
}

export async function generateOrbitCommands(
  networks: OrbitNetwork[],
  fetchTokenList: FetchTokenList,
): Promise<Command[]> {
  const orbitCommands: Command[] = [];

  for (const network of networks) {
    const { chainId, name, parentChainId } = network;
    orbitCommands.push(
      await createOrbitTokenListCommand(
        network,
        [
          getUniswapTokenListFromParentChainId(parentChainId),
          getCoinGeckoTokenListFromParentChainId(parentChainId),
          getCMCTokenListFromParentChainId(parentChainId),
        ],
        fetchTokenList,
      ),
    );

    // For L3 settling on ArbOne, generate arbified native token list
    if (parentChainId === 42161) {
      orbitCommands.push(
        await addCommand({
          name: `${name} Arbify L2 native list`,
          chainId,
          fetchTokenList,
          path: `ArbTokenLists/${chainId}_arbed_native_list.json`,
          inputLists: [
            `./src/Assets/${parentChainId}_arbitrum_native_token_list.json`,
          ],
        }),
      );
    }
  }

  return orbitCommands;
}

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    const orbitCommands = await generateOrbitCommands(customNetworks, fetch);
    const matrix: Record<'include', Command[]> = {
      include: arbitrumCommands.concat(orbitCommands),
    };

    console.log(JSON.stringify(matrix, null, 0));
  })();
}
