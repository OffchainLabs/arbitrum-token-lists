import { providers } from 'ethers';
import {
  ArbitrumNetwork,
  getArbitrumNetwork,
  MultiCaller,
} from '@arbitrum/sdk';
import { getArgvs } from './options';
import { customNetworks, rpcs } from '../customNetworks';
import { log } from 'console';

const customNetworksObject = customNetworks.reduce<{
  [chainId: number]: ArbitrumNetwork;
}>((acc, customNetwork) => {
  acc[customNetwork.chainId] = customNetwork;
  return acc;
}, {});

const allNetworks: Record<number, ArbitrumNetwork> = {
  ...customNetworksObject,
  [42_161]: getArbitrumNetwork(42_161),
  [421_614]: getArbitrumNetwork(421_614),
  [42_170]: getArbitrumNetwork(42_170),
};

export const getNetworkConfig = async () => {
  const argv = getArgvs();
  const networkID = argv.l2NetworkID;
  console.log('Using L2 networkID:', networkID);

  const childNetwork = allNetworks[networkID];
  const childProvider = new providers.JsonRpcProvider(rpcs[networkID]);

  const expectedEnv = (() => {
    if (childNetwork.parentChainId === 1) return 'MAINNET_RPC';
    else if (childNetwork.parentChainId === 11155111) return 'SEPOLIA_RPC';
    else if (childNetwork.parentChainId === 42161) return 'ARB_ONE_RPC';
    else if (childNetwork.parentChainId === 421614) return 'ARB_SEPOLIA_RPC';
    else if (childNetwork.parentChainId === 42170) return 'ARB_NOVA_RPC';
    else if (childNetwork.parentChainId === 17000) return 'HOLESKY_RPC';
    else if (childNetwork.parentChainId === 8453) return 'BASE_RPC';
    else if (childNetwork.parentChainId === 84532) return 'BASE_SEPOLIA_RPC';
    throw new Error('No parent chain RPC detected');
  })();
  const parentRpc = process.env[expectedEnv];
  if (!parentRpc) throw new Error(`Please set ${expectedEnv}`);

  const parentProvider = new providers.JsonRpcProvider(parentRpc);
  const parentMultiCaller = await MultiCaller.fromProvider(parentProvider);
  const childMulticaller = await MultiCaller.fromProvider(childProvider);

  return {
    l1: {
      provider: parentProvider,
      multiCaller: parentMultiCaller,
    },
    l2: {
      network: childNetwork,
      provider: childProvider,
      multiCaller: childMulticaller,
    },
  };
};
