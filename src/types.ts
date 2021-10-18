import { TokenInfo, TokenList, schema } from '@uniswap/token-lists'

export interface ArbTokenInfo extends TokenInfo {
    extensions: {
        "l1Address": string | null,
        "l1GatewayAddress": string |  null
    }
}


export interface ArbTokenList extends TokenList {
    tokens: ArbTokenInfo[]
}