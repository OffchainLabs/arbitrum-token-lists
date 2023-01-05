import { start } from "./start"
import { ArgvLike } from "./lib/getClargs"

const testNonCommandUsage = async () => {
    let arg: ArgvLike = {
        action: "arbify",
        tokenList: "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
        l2NetworkID: 42161
    }
    await start(arg)
}

testNonCommandUsage()