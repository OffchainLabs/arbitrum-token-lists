import { TokenInfo, TokenList } from '@uniswap/token-lists';
import { text } from 'stream/consumers';
import { string } from 'yargs';

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
    l1Address?: string;
    l2GatewayAddress?: string;
    l1GatewayAddress?: string;
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
  joinTableEntry: [
    {
      gateway: {
        gatewayAddr: string;
      };
    },
  ];
  l1TokenAddr: string;
}

export interface GraphTokensResult {
  tokens: GraphTokenResult[];
}

export interface GatewaySetResult {
  id: string;
  l1Token: string;
  gateway: string;
  blockNumber: string;
}

export interface GatewaySetsResult {
  gatewaySets: GatewaySetResult[]
}

export interface GatewaySetInfo extends GatewaySetResult {
  tx: string | null;
  logIndex: Number | null;
}