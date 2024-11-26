import { providers } from 'ethers';
import { getL2Network, MultiCaller } from '@arbitrum/sdk';
import { getArgvs } from './options';
import { rpcs } from '../customNetworks';

export const getNetworkConfig = async () => {
  const argv = getArgvs();
  const networkID = argv.l2NetworkID;
  console.log('Using L2 networkID:', networkID);

  const childRpc = rpcs[networkID];

  if (!childRpc) {
    throw new Error('No child chain RPC detected');
  }

  const childProvider = new providers.JsonRpcProvider(childRpc);
  const childNetwork = await getL2Network(childProvider);

  const expectedEnv = (() => {
    if (childNetwork.partnerChainID === 1) return 'MAINNET_RPC';
    else if (childNetwork.partnerChainID === 11155111) return 'SEPOLIA_RPC';
    else if (childNetwork.partnerChainID === 42161) return 'ARB_ONE_RPC';
    else if (childNetwork.partnerChainID === 421614) return 'ARB_SEPOLIA_RPC';
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
