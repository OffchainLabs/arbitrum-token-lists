import fs from 'fs';
import path from 'path';

import { validateTokenListWithErrorThrowing } from '../src/lib/validateTokenList';

describe('Token Lists', () => {
  it('validates that all token lists have the proper schema', async () => {
    const tokenLists = [
      // Arb1
      'src/ArbTokenLists/arbed_uniswap_labs_default.json',
      'src/ArbTokenLists/arbed_gemini_token_list.json',
      'src/ArbTokenLists/arbed_coinmarketcap.json',
      // Nova
      'src/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
      'src/ArbTokenLists/42170_arbed_gemini_token_list.json',
      'src/ArbTokenLists/42170_arbed_coinmarketcap.json',
      // Goerli
      'src/ArbTokenLists/421613_arbed_coinmarketcap.json',
    ];

    const validatedLists = tokenLists.filter(tokenListPath => {
      const file = path.join(process.cwd(), tokenListPath);
      const data = fs.readFileSync(file, {
        encoding: 'utf8',
        flag: 'r',
      });

      return !validateTokenListWithErrorThrowing(JSON.parse(data));
    });

    // Invalid lists are now displayed
    expect(validatedLists).toHaveLength(0);
  });

  describe('arbify', () => {
    jest.setTimeout(40_000);

    it('should fetch CMC list and be equal to current arbified version', async () => {
      const onlineVersion = await fetch(
        'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_list.json'
      ).then(response => response.json());

      const file = path.join(
        process.cwd(),
        'src/ArbTokenLists/arbed_uniswap_labs_default.json'
      );
      const arbifiedVersion = fs.readFileSync(file, {
        encoding: 'utf-8',
        flag: 'r',
      });

      expect(onlineVersion).toStrictEqual(JSON.parse(arbifiedVersion));
    });
  });

  // describe('update', () => {
  //   jest.setTimeout(40_000);

  //   it('should return the same list', async () => {
  //     const onlineVersion = await fetch(
  //       'https://tokenlist.arbitrum.io/FullList/all_tokens.json'
  //     ).then(response => response.json());

  //     // Run yarn command to update token list
  //     // Compare online version with newly generated, they should be the same
  //   });
  // });

  describe('fullList', () => {
    jest.setTimeout(40_000);

    it('should generate fullList for given network', async () => {
      const onlineVersion = await fetch(
        'https://tokenlist.arbitrum.io/FullList/all_tokens.json'
      ).then(response => response.json());

      const file = path.join(process.cwd(), 'src/FullList/all_tokens.json');
      const fullList = fs.readFileSync(file, {
        encoding: 'utf-8',
      });

      expect(onlineVersion).toStrictEqual(JSON.parse(fullList));
    });
  });
});
