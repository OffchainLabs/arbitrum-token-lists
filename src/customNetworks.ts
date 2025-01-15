import { ArbitrumNetwork } from '@arbitrum/sdk';
import orbitChainsData from './Assets/orbitChainsData.json';

export const customNetworks = orbitChainsData.data as ArbitrumNetwork[];

const orbitChainsRpc = orbitChainsData.data.reduce((acc, chain) => {
  acc[chain.chainId] = chain.rpcUrl;
  return acc;
}, {} as Record<number, string>);

export const rpcs: Record<number, string> = {
  // Arbitrum networks
  42161: 'https://arb1.arbitrum.io/rpc',
  42170: 'https://nova.arbitrum.io/rpc',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  // Orbit chains
  ...orbitChainsRpc,
};
