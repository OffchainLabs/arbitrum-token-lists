import { ArbitrumNetwork } from '@arbitrum/sdk';
import orbitChainsData from './Assets/orbitChainsData.json';

const excludedNetworksIds = [98865];
export const customNetworks = (
  orbitChainsData.data as ArbitrumNetwork[]
).filter((chain) => !excludedNetworksIds.includes(chain.chainId));

const orbitChainsRpc = orbitChainsData.data.reduce((acc, chain) => {
  acc[chain.chainId] = chain.rpcUrl;
  return acc;
}, {} as Record<number, string>);

if (!process.env.ARB_ONE_RPC) {
  throw new Error('process.env.ARB_ONE_RPC was not set');
}
if (!process.env.ARB_NOVA_RPC) {
  throw new Error('process.env.ARB_NOVA_RPC was not set');
}
if (!process.env.ARB_SEPOLIA_RPC) {
  throw new Error('process.env.ARB_SEPOLIA_RPC was not set');
}

export const rpcs: Record<number, string> = {
  // Arbitrum networks
  42161: process.env.ARB_ONE_RPC,
  42170: process.env.ARB_NOVA_RPC,
  421614: process.env.ARB_SEPOLIA_RPC,
  // Orbit chains
  ...orbitChainsRpc,
};
