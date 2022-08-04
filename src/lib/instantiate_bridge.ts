import { providers, Wallet, VoidSigner } from 'ethers';
import args from './getClargs';
import dotenv from 'dotenv';
import { getL1Network, getL2Network, MultiCaller } from "@arbitrum/sdk"
dotenv.config();

const networkID = args.l2NetworkID || 42161 

console.log('Using L2 networkID:', networkID);

export const getNetworkConfig = async () => {

  const l2Rpc = (() => {
    if(networkID === 42161) return "https://arb1.arbitrum.io/rpc"
    else if(networkID === 421611) return "https://rinkeby.arbitrum.io/rpc"
    else if(networkID === 42170) return "https://nova.arbitrum.io/rpc"
    throw new Error("No L2 RPC detected")
  })()
  const arbProvider = new providers.JsonRpcProvider(l2Rpc);
  const l2Network = await getL2Network(arbProvider)

  const l1Rpc = (() => {
    if(l2Network.partnerChainID === 1) return process.env['MAINNET_RPC'] as string
    else if(l2Network.partnerChainID === 4) return process.env['RINKEBY_RPC'] as string
    throw new Error("No L1 RPC detected")
  })()
  const ethProvider = new providers.JsonRpcProvider(l1Rpc)
  const l1Network = await getL1Network(ethProvider)


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