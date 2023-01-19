import { tokenListIsValid } from '../../src/lib/validateTokenList'
import uniswapExample from "./schma/uniswap.tokenlist.json"
import arblist from "./schma/arbify.tokenlist.json"
import arblistDecimalsTooLow from "./schma/arblistDecimalsTooLow.tokenlist.json"
import arblistDecimalsTooHigh from "./schma/arblistDecimalsTooHigh.tokenlist.json"
import arblistNameTooLong from "./schma/arblistNameTooLong.tokenlist.json"
import arblistSymbolTooLong from "./schma/arblistSymbolTooLong.tokenlist.json"
import arblistWrongAddress from "./schma/arblistWrongAddress.tokenlist.json"
import arblistWrongChainId from "./schma/arblistWrongChainId.tokenlist.json"

describe("TokenListIsValid Test", () => {
    it("Should return true when list is valid (Uniswap Example)", () => {
        expect(tokenListIsValid(uniswapExample)).toBeTruthy()
    })

    it("Should return true when list is valid (Arbify tokenlist Example)", () => {
        expect(tokenListIsValid(arblist)).toBeTruthy()
    })

    it("Should return false when list is invalid (Decimals not right)", () => {
        expect(tokenListIsValid(arblistDecimalsTooLow)).toBeFalsy()
        expect(tokenListIsValid(arblistDecimalsTooHigh)).toBeFalsy()
    })

    it("Should return false when list is invalid (Name too long)", () => {
        expect(tokenListIsValid(arblistNameTooLong)).toBeFalsy()
    })

    it("Should return false when list is invalid (Address not right)", () => {
        expect(tokenListIsValid(arblistSymbolTooLong)).toBeFalsy()
    })

    it("Should return false when list is invalid (Symbol too long)", () => {
        expect(tokenListIsValid(arblistWrongAddress)).toBeFalsy()
    })

    it("Should return false when list is invalid (Wrong chainId)", () => {
        expect(tokenListIsValid(arblistWrongChainId)).toBeFalsy()
    })
})
