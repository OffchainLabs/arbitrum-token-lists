import { tokenListIsValid, validateTokenListWithErrorThrowing } from '../../src/lib/validateTokenList'
import uniswapExample from "./schma/uniswap.tokenlist.json"
import arblist from "./schma/arbify.tokenlist.json"
import arblistDecimalsTooLow from "./schma/arblistDecimalsTooLow.tokenlist.json"
import arblistDecimalsTooHigh from "./schma/arblistDecimalsTooHigh.tokenlist.json"
import arblistNameTooLong from "./schma/arblistNameTooLong.tokenlist.json"
import arblistSymbolTooLong from "./schma/arblistSymbolTooLong.tokenlist.json"
import arblistWrongAddress from "./schma/arblistWrongAddress.tokenlist.json"
import arblistWrongChainId from "./schma/arblistWrongChainId.tokenlist.json"

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
            validateTokenListWithErrorThrowing(arblistDecimalsTooLow)
        }).toThrowError(errorCode)
        expect(() => {
            validateTokenListWithErrorThrowing(arblistDecimalsTooHigh)
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
