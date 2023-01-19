import { tokenListIsValid } from '../../src/lib/validateTokenList';
import uniswapExample from "./schma/uniswap.tokenlist.json";
import arblist from "./schma/arbify.tokenlist.json";
import arblistdecimalsTooLow from "./schma/arbifyInvalid1.tokenlist.json"
import arblistdecimalsTooHigh from "./schma/arbifyInvalid2.tokenlist.json"
import arblistNameTooLong from "./schma/arbifyInvalid3.tokenlist.json"
import arblistSymbolTooLong from "./schma/arbifyInvalid4.tokenlist.json"
import arblistWrongAddress from "./schma/arbifyInvalid5.tokenlist.json"
import arblistWrongChainId from "./schma/arbifyInvalid6.tokenlist.json"

describe("TokenListIsValid Test", () => {

    it("Should return true when list is valid (Uniswap Example)", () => {
        expect(tokenListIsValid(uniswapExample)).toBeTruthy()
    })

    it("Should return true when list is valid (Arbify tokenlist Example)", () => {
        expect(tokenListIsValid(arblist)).toBeTruthy()
    })

    it("Should return false when list is invalid (Decimals not right)", () => {
        expect(tokenListIsValid(arblistdecimalsTooLow)).toBeFalsy()
        expect(tokenListIsValid(arblistdecimalsTooHigh)).toBeFalsy()
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
