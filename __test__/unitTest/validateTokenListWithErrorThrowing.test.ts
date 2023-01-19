import { tokenListIsValid, validateTokenListWithErrorThrowing } from '../../src/lib/validateTokenList';
import uniswapExample from "./schma/uniswap.tokenlist.json";
import arblist from "./schma/arbify.tokenlist.json";
import arblistdecimalsTooLow from "./schma/arbifyInvalid1.tokenlist.json"
import arblistdecimalsTooHigh from "./schma/arbifyInvalid2.tokenlist.json"
import arblistNameTooLong from "./schma/arbifyInvalid3.tokenlist.json"
import arblistSymbolTooLong from "./schma/arbifyInvalid4.tokenlist.json"
import arblistWrongAddress from "./schma/arbifyInvalid5.tokenlist.json"
import arblistWrongChainId from "./schma/arbifyInvalid6.tokenlist.json"

describe("TokenListIsValid Test", () => {
    const errorCode = 'Data does not conform to token list schema; not sure why'

    it("Should return true when list is valid (Uniswap Example)", () => {
        expect(tokenListIsValid(uniswapExample)).toBeTruthy()
    })

    it("Should return true when list is valid (Arbify tokenlist Example)", () => {
        expect(tokenListIsValid(arblist)).toBeTruthy()
    })

    it("Should return false when list is invalid (Decimals not right)", () => {
        expect(() => {
            validateTokenListWithErrorThrowing(arblistdecimalsTooLow)
        }).toThrowError(errorCode)
        expect(() => {
            validateTokenListWithErrorThrowing(arblistdecimalsTooHigh)
        }).toThrowError(errorCode)
    })

    it("Should return false when list is invalid (Name too long)", () => {
        expect(() => {
            validateTokenListWithErrorThrowing(arblistNameTooLong)
        }).toThrowError(errorCode)
    })

    it("Should return false when list is invalid (Address not right)", () => {
        expect(() => {
            validateTokenListWithErrorThrowing(arblistSymbolTooLong)
        }).toThrowError(errorCode)
    })

    it("Should return false when list is invalid (Symbol too long)", () => {
        expect(() => {
            validateTokenListWithErrorThrowing(arblistWrongAddress)
        }).toThrowError(errorCode)
    })

    it("Should return false when list is invalid (Wrong chainId)", () => {
        expect(() => {
            validateTokenListWithErrorThrowing(arblistWrongChainId)
        }).toThrowError(errorCode)
    })
})
