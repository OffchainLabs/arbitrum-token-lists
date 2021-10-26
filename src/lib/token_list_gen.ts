import { TokenList } from '@uniswap/token-lists';
import { instantiateBridge } from './instantiate_bridge';
import { getAllTokens, getTokens } from './graph';

import { ArbTokenList } from './types';
import {
  excludeList,
  getL2TokenData,
  getL2TokenAddresses,
  getLogoUri,
  getTokenListObj,
  listNameToFileName,
} from './utils';
import { writeFileSync, writeFile } from 'fs';

export interface ArbificationOptions {
  overwriteCurrentList: boolean;
}

export interface L2ToL1GatewayAddresses {
  [contractAddress: string]: string;
}
const l2ToL1GatewayAddresses: L2ToL1GatewayAddresses = {
  '0x09e9222e96e7b4ae2a407b98d48e330053351eee':
    '0xa3A7B6F88361F48403514059F1F16C8E78d60EeC',
  '0x096760f208390250649e3e8763348e783aef5562':
    '0xcEe284F754E854890e311e3280b767F80797180d',
  '0x6c411ad3e74de3e7bd422b94a27770f5b86c623b':
    '0xd92023E9d9911199a6711321D1277285e6d4e2db',
  '0x467194771dae2967aef3ecbedd3bf9a310c76c65':
    '0xD3B5b60020504bc3489D6949d545893982BA3011',
};

export const generateTokenList = async (
  _l1TokenAddresses: string[] | 'all',
  name: string
) => {
  const bridgeData = await instantiateBridge();
  const { bridge, l1Network, l2Network } = bridgeData;
  const tokens =
    _l1TokenAddresses === 'all'
      ? await getAllTokens(l2Network.chainID)
      : await getTokens(_l1TokenAddresses, l2Network.chainID);
  const l1TokenAddresses = tokens.map((token: any) => token.id);
  const l2Addresses = await getL2TokenAddresses(l1TokenAddresses, bridge);
  const tokenData = await getL2TokenData(l2Addresses, bridge);
  const logoUris: (string | undefined)[] = [];
  for (const token of tokens) {
    const uri = await getLogoUri(token.id);
    logoUris.push(uri);
  }

  const tokenList = tokens.map((token: any, i: number) => {
    const l2GatewayAddress = token.gateway[0].id.slice(0, 42) as string;
    const address = l2Addresses[i];
    const { name, decimals, symbol } = tokenData[i];
    let arbTokenInfo = {
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
    if (logoUris[i]) {
      arbTokenInfo = { ...{ logoURI: logoUris[i] }, ...arbTokenInfo };
    }

    return arbTokenInfo;
  });
  //   @ts-ignore
  tokenList.sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

  const arbTokenList: ArbTokenList = {
    name: `Arbified: ${name}`,
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

export const arbifyL1List = async (pathOrUrl: string) => {
  const l1TokenList = await getTokenListObj(pathOrUrl);

  const l1Addresses = l1TokenList.tokens.map((token) =>
    token.address.toLowerCase()
  );

  const newList = await generateTokenList(l1Addresses, l1TokenList.name);
  const path =
    process.env.PWD +
    '/src/ArbTokenLists/' +
    listNameToFileName(l1TokenList.name);

  writeFileSync(path, JSON.stringify(newList));
};
