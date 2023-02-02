import { yargsInstance } from '../../src/main';
import { handler as handlerAllTokensList } from '../../src/commands/allTokensList';
import { handler as handlerArbify } from '../../src/commands/arbify';
import { handler as handlerFull } from '../../src/commands/full';
import { handler as handlerUpdate } from '../../src/commands/update';
import { Action, Args } from '../../src/lib/options';
import { ArbTokenList, EtherscanList } from '../../src/lib/types';

const handlers: {
  [action in Action]?: (argv: Args) => Promise<ArbTokenList | EtherscanList>;
} = {
  [Action.AllTokensList]: handlerAllTokensList,
  [Action.Arbify]: handlerArbify,
  [Action.Full]: handlerFull,
  [Action.Update]: handlerUpdate,
};
const runCommand = async (command: Action, options: string[]) => {
  const argv = await yargsInstance.parseAsync(['_', command, ...options]);
  return handlers[command]!(argv);
};
const compareLists = (
  l1: ArbTokenList | EtherscanList,
  l2: ArbTokenList | EtherscanList
) => {
  // Both lists are EtherscanList
  if ('timestamp' in l1 && 'timestamp' in l2) {
    const { timestamp: t1, version: v1, ...list1 } = l1;
    const { timestamp: t2, version: v2, ...list2 } = l2;
    /**
     * Lists are stored using JSON.stringify which removes property with undefined values
     * We use stringify then parse here to get the same list
     */
    return expect(JSON.parse(JSON.stringify(list1))).toStrictEqual(list2);
  }

  return expect(l1).toStrictEqual(l2);
};

// check for top-level duplicate token (i.e. same adddress on the same chain)
const findDuplicateTokens = (arbTokenList: ArbTokenList) => {
  const appearanceCount: {
    [asdf: string]: number;
  } = {};

  arbTokenList.tokens.forEach(token => {
    const uniqueID = `${token.address},,${token.chainId}`;
    if (appearanceCount[uniqueID]) {
      appearanceCount[uniqueID]++;
    } else {
      appearanceCount[uniqueID] = 1;
    }
  });
  return Object.keys(appearanceCount).filter(uniqueID => {
    return appearanceCount[uniqueID] > 1;
  });
};

const testNoDuplicates = (arbTokenList: ArbTokenList) => {
  const dups = findDuplicateTokens(arbTokenList);
  expect(dups).toMatchObject([]);
};

describe('Token Lists', () => {
  jest.setTimeout(200_000);

  describe('Arbify token lists', () => {
    it('Arb1 Uniswap', async () => {
      expect.assertions(2);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42161',
          '--tokenList=https://gateway.ipfs.io/ipns/tokens.uniswap.org',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_list.json'
        ).then(response => response.json()),
      ]);
      testNoDuplicates(localList as ArbTokenList);

      compareLists(localList, onlineList);
    });

    it('Arb1 Gemini', async () => {
      expect.assertions(2);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42161',
          '--tokenList=https://www.gemini.com/uniswap/manifest.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_gemini_token_list.json'
        ).then(response => response.json()),
      ]);

      testNoDuplicates(localList as ArbTokenList);

      compareLists(localList, onlineList);
    });

    it('Arb1 CMC', async () => {
      expect.assertions(2);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42161',
          '--tokenList=https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json'
        ).then(response => response.json()),
      ]);
      testNoDuplicates(localList as ArbTokenList);

      compareLists(localList, onlineList);
    });

    it('Arb Nova Uniswap', async () => {
      expect.assertions(2);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42170',
          '--tokenList=https://gateway.ipfs.io/ipns/tokens.uniswap.org',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json'
        ).then(response => response.json()),
      ]);

      testNoDuplicates(localList as ArbTokenList);

      compareLists(localList, onlineList);
    });

    it('Arb Nova Gemini', async () => {
      expect.assertions(2);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42170',
          '--tokenList=https://www.gemini.com/uniswap/manifest.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_gemini_token_list.json'
        ).then(response => response.json()),
      ]);
      testNoDuplicates(localList as ArbTokenList);
      compareLists(localList, onlineList);
    });

    it('Arb Nova CMC', async () => {
      expect.assertions(2);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42170',
          '--tokenList=https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coinmarketcap.json'
        ).then(response => response.json()),
      ]);
      testNoDuplicates(localList as ArbTokenList);
      compareLists(localList, onlineList);
    });

    it('Arb Goerli CMC', async () => {
      expect.assertions(2);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=421613',
          '--tokenList=https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.json'
        ).then(response => response.json()),
      ]);
      testNoDuplicates(localList as ArbTokenList);
      compareLists(localList, onlineList);
    });
  });

  describe('Update token lists', () => {
    it('should return the same list as the online version', async () => {
      expect.assertions(1);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Update, [
          '--l2NetworkID=42161',
          '--tokenList=https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
          '--includeOldDataFields=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json'
        ).then(response => response.json()),
      ]);
      testNoDuplicates(localList as ArbTokenList);
      compareLists(localList, onlineList);
    });
  });

  describe('fullList', () => {
    it('should generate fullList for a given network', async () => {
      expect.assertions(1);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Full, [
          '--l2NetworkID=42161',
          '--tokenList=full',
          '--ignorePreviousList=true',
        ]),
        fetch('https://tokenlist.arbitrum.io/FullList/all_tokens.json').then(
          response => response.json()
        ),
      ]);

      compareLists(localList, onlineList);
    });
  });

  describe('allTokensList', () => {
    it('should generate allTokensList for a given network', async () => {
      expect.assertions(2);
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.AllTokensList, [
          '--l2NetworkID=421613',
          '--tokenList=full',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_full.json'
        ).then(response => response.json()),
      ]);
      testNoDuplicates(localList as ArbTokenList);
      compareLists(localList, onlineList);
    });
  });

  describe('External lists tests', () => {
    it.skip('External lists: check no duplicates', async () => {
      const lists = [
        'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_gemini_token_list.json',
        'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
        'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
        'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_list.json',
        'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
        'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.json',
        'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coinmarketcap.json',
        'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_gemini_token_list.json',
      ];
      expect.assertions(lists.length);

      for (const list of lists) {
        const res = await fetch(list);
        const data = (await res.json()) as ArbTokenList;

        testNoDuplicates(data as ArbTokenList);
      }
    });
  });
});
