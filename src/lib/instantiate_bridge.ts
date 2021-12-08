import { BridgeHelper, networks, Bridge } from 'arb-ts';
import { providers, Wallet, VoidSigner } from 'ethers';
import args from './getClargs';
import dotenv from 'dotenv';
dotenv.config();

const networkID = args.networkID?.toString() || '1';

console.log('Using L1 networkID:', networkID);


export const instantiateBridge = async (
) => {
  const network = networks[networkID];
  if (!network) {
    throw new Error(`Unrecognized network ID: ${networkID}`);
  }

  const l1Network = network.isArbitrum
    ? networks[network.partnerChainID]
    : network;
  const l2Network = networks[l1Network.partnerChainID];

  const ethProvider = new providers.JsonRpcProvider(l1Network.rpcURL);
  const arbProvider = new providers.JsonRpcProvider(l2Network.rpcURL);

  // random address for void signer:
  const l1Signer = new VoidSigner("0xAddA0B73Fe69a6E3e7c1072Bb9523105753e08f8", ethProvider) 
  const l2Signer = new VoidSigner("0xAddA0B73Fe69a6E3e7c1072Bb9523105753e08f8", arbProvider) 

  const bridge = await Bridge.init(l1Signer, l2Signer);

  return { bridge, l1Network, l2Network };
};
