import { TokenInfo, TokenList } from '@uniswap/token-lists';

export interface ArbTokenInfo extends TokenInfo {
  extensions?: {
    bridgeInfo: {
      [destinationChainID: string]:{
        tokenAddress: string,
        originBridgeAddress: string,
        destBridgeAddress: string
      }
    }
  }
}

export interface ArbTokenList extends TokenList {
  tokens: ArbTokenInfo[];
}


export interface EtherscanToken {
  l1Address: string | null,
  l2Address: string,
  l1GatewayAddress: string | null,
  l2GatewayAddress: string | null
}

export type EtherscanList = EtherscanToken[]


export interface GraphTokenResult {
  l2Address: string | null,
  joinTableEntry: [{
    gateway: {
      gatewayAddr: string
    }
  }],
  l1TokenAddr: string
}

export interface GraphTokensResult {
  tokens: GraphTokenResult[]
}