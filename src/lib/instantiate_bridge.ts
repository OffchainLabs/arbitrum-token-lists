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
    421614: 'https://sepolia-rollup.arbitrum.io/rpc',
    660279: 'https://xai-chain.net/rpc',
    1380012617: 'https://mainnet.rpc.rarichain.org/http',
    4078: 'https://muster.alt.technology',
    70700: 'https://rpc.apex.proofofplay.com',
    37714555429: 'https://testnet-v2.xai-chain.net/rpc',
    53457: 'https://dodochain-testnet.alt.technology',
    4162: 'https://rpc-rollup.sx.technology',
  }[networkID];

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
