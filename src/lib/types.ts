import { TokenInfo, TokenList } from '@uniswap/token-lists';

// extensions object is allowed to be 2 levels deep, but type is out-of-date
// https://github.com/Uniswap/token-lists/pull/67
export interface ArbTokenInfo extends Omit<TokenInfo, 'extensions'> {
  extensions?: {
    bridgeInfo: {
      [destinationChainID: string]: {
        tokenAddress: string;
        originBridgeAddress: string;
        destBridgeAddress: string;
      };
    };
  };
}

export interface ArbTokenList extends Omit<TokenList, 'tokens'> {
  tokens: ArbTokenInfo[];
}

export interface EtherscanToken {
  l1Address: string | null;
  l2Address: string;
  l1GatewayAddress: string | null;
  l2GatewayAddress: string | null;
}

export type EtherscanList = EtherscanToken[];

export interface GraphTokenResult {
  l2Address: string | null;
  joinTableEntry: [
    {
      gateway: {
        gatewayAddr: string;
      };
    }
  ];
  l1TokenAddr: string;
  logoUri: string | undefined;
}

export interface GraphTokensResult {
  tokens: GraphTokenResult[];
}
