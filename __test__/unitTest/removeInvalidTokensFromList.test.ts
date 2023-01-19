import { removeInvalidTokensFromList } from "../../src/lib/utils"
import arblist from "./schma/arbify.tokenlist.json"
import arblistDecimalsTooLow from "./schma/arbifyInvalid1.tokenlist.json"
import arblistWrongVersion from "./schma/arblistWrongVersion.tokenlist.json"

describe("removeInvalidTokensFromList Test", () => {
    it("Should return same when use correct list", () => {
        
        expect(removeInvalidTokensFromList(arblist)).toEqual(arblist)
    })

    it("Should remove wrong token when use incorrect list", () => {
        const preImage = JSON.parse(
            JSON.stringify(arblistDecimalsTooLow)
          ) as typeof arblistDecimalsTooLow;
        const correctList = removeInvalidTokensFromList(arblistDecimalsTooLow)
        expect(correctList.tokens.length).toBeLessThan(preImage.tokens.length)
        correctList.tokens.forEach(tokenInfo => {
            expect(tokenInfo.name).not.toEqual("blah blah ")
        })
        arblistDecimalsTooLow.tokens = preImage.tokens
    })

    it("Should throw Error when issues happen outside of tokens", () => {
        const preImage = JSON.parse(
            JSON.stringify(arblistWrongVersion)
          ) as typeof arblistWrongVersion;
        expect(() => {
            removeInvalidTokensFromList(arblistWrongVersion)
        }).toThrowError('Data does not confirm to token list schema; not sure why')
    })
})