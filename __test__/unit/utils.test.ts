import { removeInvalidTokensFromList } from '../../src/lib/utils';
import arblist from './schema/arbify.tokenlist.json';
import arblistDecimalsTooLow from './schema/arblistDecimalsTooLow.tokenlist.json';
import arblistWrongVersion from './schema/arblistWrongVersion.tokenlist.json';

describe('utils Test', () => {
  describe('removeInvalidTokensFromList Test', () => {
    it('Should return same when use correct list', () => {
      expect(removeInvalidTokensFromList(arblist)).toEqual(arblist);
    });

    it('Should remove wrong token when use incorrect list', () => {
      const listToBeFixed = JSON.parse(
        JSON.stringify(arblistDecimalsTooLow),
      ) as typeof arblistDecimalsTooLow;
      const correctList = removeInvalidTokensFromList(listToBeFixed);
      expect(correctList.tokens.length).toBeLessThan(
        arblistDecimalsTooLow.tokens.length,
      );
      correctList.tokens.forEach((tokenInfo) => {
        expect(tokenInfo.name).not.toEqual('blah blah ');
      });
    });

    it('Should throw Error when issues happen outside of tokens', () => {
      const listToBeFixed = JSON.parse(
        JSON.stringify(arblistWrongVersion),
      ) as typeof arblistWrongVersion;
      expect(() => {
        removeInvalidTokensFromList(listToBeFixed);
      }).toThrow('Data does not confirm to token list schema; not sure why');
    });
  });
});
