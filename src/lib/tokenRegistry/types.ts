// Every address in the registry files is lowercase.

export type RegistryChain = {
  chainId: number;
  name: string;
  // Absent on Ethereum.
  parentChainId?: number;
  // The gas token's address on the parent chain. Absent when the gas token is Ether.
  nativeToken?: string;
  // The lists that hold the chain's canonical tokens, with the parent token in bridgeInfo.
  tokenListUrls: string[];
};

export type ChainPair = {
  sourceChainId: number;
  destinationChainId: number;
};

export type TokenListEntry = {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  extensions?: {
    bridgeInfo?: Record<string, { tokenAddress: string }>;
  };
};

export type LifiToken = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coinKey?: string;
};

export type LifiConnection = {
  fromTokens: string[];
  toTokens: string[];
};

export type CuratedToken = {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
};

export type RegistryToken = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coinKey?: string;
  // The canonical parent token on the chain's parent chain, from bridgeInfo. On the native token
  // of a custom gas chain, the gas token's ERC-20 on the parent chain.
  parentAddress?: string;
  // Set on canonical parent tokens that answer oftVersion().
  isOft?: true;
  // The same token on the other registry chains, keyed by chain id.
  counterparts?: Record<string, string>;
};

export const REGISTRY_VERSION = 1;

export type ChainFile = {
  version: typeof REGISTRY_VERSION;
  generatedAt: string;
  chainId: number;
  parentChainId?: number;
  tokens: RegistryToken[];
};

export type PairFile = {
  version: typeof REGISTRY_VERSION;
  generatedAt: string;
  sourceChainId: number;
  destinationChainId: number;
  // Absent when LiFi does not connect the two chains.
  lifi?: LifiConnection;
};

export type IndexFile = {
  version: typeof REGISTRY_VERSION;
  generatedAt: string;
  chains: Omit<RegistryChain, 'tokenListUrls'>[];
  pairs: ChainPair[];
};
