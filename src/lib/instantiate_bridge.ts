import { providers, Wallet, VoidSigner } from 'ethers';
import args from './getClargs';
import dotenv from 'dotenv';
import { getL1Network, getL2Network, MultiCaller } from "@arbitrum/sdk"
dotenv.config();

const networkID = args.l2NetworkID || 42161 

console.log('Using L2 networkID:', networkID);

export const getNetworkConfig = async () => {
  const l2Network = await getL2Network(networkID)
  const l1Network = await getL1Network(l2Network.partnerChainID)

  const arbProvider = new providers.JsonRpcProvider(l2Network.rpcURL);
  const ethProvider = new providers.JsonRpcProvider(l1Network.rpcURL)

  const l1MultiCaller = await MultiCaller.fromProvider(ethProvider)
  const l2MultiCaller = await MultiCaller.fromProvider(arbProvider)

  return {
    l1: {
      network: l1Network,
      provider: ethProvider,
      multiCaller: l1MultiCaller
    },
    l2: {
      network: l2Network,
      provider: arbProvider,
      multiCaller: l2MultiCaller
    },
  }  
}