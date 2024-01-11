import { providers } from 'ethers';
import { getL2Network, MultiCaller } from '@arbitrum/sdk';
import { getArgvs } from './options';

export const getNetworkConfig = async () => {
  const argv = getArgvs();
  const networkID = argv.l2NetworkID;
  console.log('Using L2 networkID:', networkID);

  const childRpc = {
    42161: 'https://arb1.arbitrum.io/rpc',
    42170: 'https://nova.arbitrum.io/rpc',
    421613: 'https://goerli-rollup.arbitrum.io/rpc',
    421614: 'https://sepolia-rollup.arbitrum.io/rpc',
    660279: 'https://xai-chain.net/rpc',
  }[networkID];

  if (!childRpc) {
    throw new Error('No child chain RPC detected');
  }

  const childProvider = new providers.JsonRpcProvider(childRpc);
  const childNetwork = await getL2Network(childProvider);

  const expectedEnv = (() => {
    if (childNetwork.partnerChainID === 1) return 'MAINNET_RPC';
    else if (childNetwork.partnerChainID === 5) return 'GOERLI_RPC';
    else if (childNetwork.partnerChainID === 11155111) return 'SEPOLIA_RPC';
    else if (childNetwork.partnerChainID === 42161) return 'ARB_ONE_RPC';
    throw new Error('No L1 RPC detected');
  })();
  const parentRpc = process.env[expectedEnv];
  if (!parentRpc) throw new Error(`Please set ${expectedEnv}`);

  const parentProvider = new providers.JsonRpcProvider(parentRpc);

  const l1MultiCaller = await MultiCaller.fromProvider(parentProvider);
  const l2MultiCaller = await MultiCaller.fromProvider(childProvider);

  return {
    l1: {
      provider: parentProvider,
      multiCaller: l1MultiCaller,
    },
    l2: {
      network: childNetwork,
      provider: childProvider,
      multiCaller: l2MultiCaller,
    },
  };
};
