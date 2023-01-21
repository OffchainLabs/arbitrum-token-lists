import {
  tokenListIsValid,
  validateTokenListWithErrorThrowing,
} from '../src/lib/validateTokenList';
import uniswapExample from './schema/uniswap.tokenlist.json';
import arblist from './schema/arbify.tokenlist.json';
import arblistDecimalsTooLow from './schema/arblistDecimalsTooLow.tokenlist.json';
import arblistDecimalsTooHigh from './schema/arblistDecimalsTooHigh.tokenlist.json';
import arblistNameTooLong from './schema/arblistNameTooLong.tokenlist.json';
import arblistSymbolTooLong from './schema/arblistSymbolTooLong.tokenlist.json';
import arblistWrongAddress from './schema/arblistWrongAddress.tokenlist.json';
import arblistWrongChainId from './schema/arblistWrongChainId.tokenlist.json';

describe('validateTokenList Test', () => {
  describe('TokenListIsValid Test', () => {
    it('Should return true when list is valid (Uniswap Example)', () => {
      expect(tokenListIsValid(uniswapExample)).toBeTruthy();
    });

    it('Should return true when list is valid (Arbify tokenlist Example)', () => {
      expect(tokenListIsValid(arblist)).toBeTruthy();
    });

    it('Should return false when list is invalid (Decimals not right)', () => {
      expect(tokenListIsValid(arblistDecimalsTooLow)).toBeFalsy();
      expect(tokenListIsValid(arblistDecimalsTooHigh)).toBeFalsy();
    });

    it('Should return false when list is invalid (Name too long)', () => {
      expect(tokenListIsValid(arblistNameTooLong)).toBeFalsy();
    });

    it('Should return false when list is invalid (Address not right)', () => {
      expect(tokenListIsValid(arblistSymbolTooLong)).toBeFalsy();
    });

    it('Should return false when list is invalid (Symbol too long)', () => {
      expect(tokenListIsValid(arblistWrongAddress)).toBeFalsy();
    });

    it('Should return false when list is invalid (Wrong chainId)', () => {
      expect(tokenListIsValid(arblistWrongChainId)).toBeFalsy();
    });
  });

  describe('validateTokenListWithErrorThrowing Test', () => {
    const errorCode =
      'Data does not conform to token list schema; not sure why';

    it('Should return true when list is valid (Uniswap Example)', () => {
      expect(validateTokenListWithErrorThrowing(uniswapExample)).toBeTruthy();
    });

    it('Should return true when list is valid (Arbify tokenlist Example)', () => {
      expect(validateTokenListWithErrorThrowing(arblist)).toBeTruthy();
    });

    it('Should return false when list is invalid (Decimals not right)', () => {
      expect(() => {
        validateTokenListWithErrorThrowing(arblistDecimalsTooLow);
      }).toThrowError(errorCode);
      expect(() => {
        validateTokenListWithErrorThrowing(arblistDecimalsTooHigh);
      }).toThrowError(errorCode);
    });

    it('Should return false when list is invalid (Name too long)', () => {
      expect(() => {
        validateTokenListWithErrorThrowing(arblistNameTooLong);
      }).toThrowError(errorCode);
    });

    it('Should return false when list is invalid (Address not right)', () => {
      expect(() => {
        validateTokenListWithErrorThrowing(arblistSymbolTooLong);
      }).toThrowError(errorCode);
    });

    it('Should return false when list is invalid (Symbol too long)', () => {
      expect(() => {
        validateTokenListWithErrorThrowing(arblistWrongAddress);
      }).toThrowError(errorCode);
    });

    it('Should return false when list is invalid (Wrong chainId)', () => {
      expect(() => {
        validateTokenListWithErrorThrowing(arblistWrongChainId);
      }).toThrowError(errorCode);
    });
  });
});
