// import { removeInvalidTokensFromList, validateTokenListWithErrorThrowing, tokenListIsValid} from '../../src/lib/utils'
import { removeInvalidTokensFromList } from "../../src/lib/utils"
import arblist from "./schma/arbify.tokenlist.json";
import arblistdecimalsTooLow from "./schma/arbifyInvalid1.tokenlist.json"
import arblistWrongVersion from "./schma/arbifyInvalid7.tokenlist.json"

describe("removeInvalidTokensFromList Test", () => {

    it("Should return same when use correct list", () => {
        
        expect(removeInvalidTokensFromList(arblist)).toEqual(arblist)
    })

    it("Should remove wrong token when use incorrect list", () => {
        const preImage = JSON.parse(
            JSON.stringify(arblistdecimalsTooLow)
          ) as typeof arblistdecimalsTooLow;
        const correctList = removeInvalidTokensFromList(arblistdecimalsTooLow)
        expect(correctList.tokens.length).toBeLessThan(preImage.tokens.length)
        correctList.tokens.forEach(tokenInfo => {
            expect(tokenInfo.name).not.toEqual("blah blah ")
        })
        arblistdecimalsTooLow.tokens = preImage.tokens
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