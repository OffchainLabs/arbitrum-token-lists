import { TokenList } from '@uniswap/token-lists';
import { instantiateBridge } from './instantiate_bridge';
import {getAllTokens, getTokens } from './graph'

import { ArbTokenList } from './types';
import { excludeList, getL2TokenData, getL2TokenAddresses, getZapperURIs, getLogoUri } from './utils';

export interface ArbificationOptions {
  overwriteCurrentList: boolean;
}

export interface L2ToL1GatewayAddresses {
  [contractAddress: string]: string
}
const l2ToL1GatewayAddresses:L2ToL1GatewayAddresses = {
  "x" : "y"
}

export const generateTokenList = async (_l1TokenAddresses: string[] | 'all') => {
  const bridgeData = await instantiateBridge();
  const { bridge, l1Network, l2Network } = bridgeData;

  const tokens = _l1TokenAddresses === 'all' ? await getAllTokens(l2Network.chainID)   : await getTokens(_l1TokenAddresses, l2Network.chainID)
  const l1TokenAddresses = _l1TokenAddresses === 'all' ? tokens.map((token:any)=> token.id) : _l1TokenAddresses
  
  const l2Addresses = await getL2TokenAddresses(l1TokenAddresses, bridge)
  const tokenData =  await getL2TokenData(l1TokenAddresses, bridge)
  const zapperLogoUris = await getZapperURIs()
  const logoUris: string[] = [];
  for (const token of tokens) {
    const uri = (await getLogoUri(token.id, zapperLogoUris)) as string;
    logoUris.push(uri);
  }

  const tokenList = tokens.map((token: any, i: number) => {
    const l2GatewayAddress = token.gateway[0].id.slice(0, 42) as string
    const address = l2Addresses[i];
    const { name, decimals, symbol } = tokenData[i];
    return {
      logoURI: logoUris[i],
      chainId: +l2Network.chainID,
      address: address,
      name,
      symbol,
      decimals,
      extensions: {
        l1Address: token.id,
        l2GatewayAddress,
        l1GatewayAddress: l2ToL1GatewayAddresses[l2GatewayAddress],
      },
    };
  });
  //   @ts-ignore
  tokenList.sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

  const arbTokenList: ArbTokenList = {
    name: l2Network.name,
    timestamp: new Date().toISOString(),
    version: {
      major: 0,
      minor: 0,
      patch: 0,
    },
    tokens: tokenList,
  };
  return arbTokenList;
};

