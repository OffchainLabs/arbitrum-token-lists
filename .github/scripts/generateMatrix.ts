import { customNetworks } from '../../src/customNetworks';

type Command = {
  name: string;
  paths: string[];
  version: boolean;
  command: string;
};

const matrix: Record<'include', Command[]> = {
  include: [
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
  ],
};

console.log(JSON.stringify(matrix, null, 0));
