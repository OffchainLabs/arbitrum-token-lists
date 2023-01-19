import {  arbListtoEtherscanList } from '../../src/lib/token_list_gen'
import arblist from "./schema/arbify.tokenlist.json";

describe("arbListtoEtherscanList Test", () => {
    it("Should return etherscanlist when use correct arblist", () => {
        expect(() => {
            arbListtoEtherscanList(arblist)
        }).not.toThrow(Error)
    })
})