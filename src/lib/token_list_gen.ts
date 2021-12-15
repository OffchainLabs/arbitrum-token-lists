import {  minVersionBump, nextVersion, Version, diffTokenLists, VersionUpgrade } from '@uniswap/token-lists';
import { instantiateBridge } from './instantiate_bridge';
import { getAllTokens, getTokens } from './graph';
import { TokenInfo } from '@uniswap/token-lists';

import { ArbTokenList, ArbTokenInfo, EtherscanList, GraphTokenResult } from './types';
import {
  getL2TokenData,
  getL2TokenAddresses,
  getLogoUri,
  getTokenListObj,
  listNameToFileName,
  validateTokenListWithErrorThrowing,
  sanitizeString,
  listNameToArbifiedListName,
  isArbTokenList
} from './utils';
import { writeFileSync, writeFile, readFileSync, existsSync } from 'fs';

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
    '0xd3b5b60020504bc3489d6949d545893982ba3011',
    "0x195c107f3f75c4c93eba7d9a1312f19305d6375f": "0x91169Dbb45e6804743F94609De50D511C437572E",
    "0x9b014455acc2fe90c52803849d0002aeec184a06":"0x917dc9a69F65dC3082D518192cd3725E1Fa96cA2",
    "0xf94bc045c4e926cc0b34e8d1c41cd7a043304ac9": "0x81d1a19cf7071732D4313c75dE8DD5b8CF697eFD",
    "0xf90eb31045d5b924900aff29344deb42eae0b087": "0x81d1a19cf7071732D4313c75dE8DD5b8CF697eFD",


};

export const generateTokenList = async (
  _l1TokenAddresses: string[] | 'all',
  name: string,
  mainLogoUri?: string,
  prevArbTokenList?: ArbTokenList,
  options?: {
    includeUnbridgedL1Tokens: TokenInfo[]
  }
) => {
  const bridgeData = await instantiateBridge();
  const { bridge, l1Network, l2Network } = bridgeData;
  let tokens =
    _l1TokenAddresses === 'all'
      ? await getAllTokens(l2Network.chainID)
      : await getTokens(_l1TokenAddresses, l2Network.chainID);

  
  const l1TokenAddresses = tokens.map((token:GraphTokenResult) => token.l1TokenAddr);
  const l2Addresses = await getL2TokenAddresses(l1TokenAddresses, bridge);
  
  const tokenData = await getL2TokenData(l2Addresses, bridge);
  const logoUris: (string | undefined)[] = [];
  for (const token of tokens) {
    const uri = await getLogoUri(token.l1TokenAddr);
    logoUris.push(uri);
  }

  let tokenList:ArbTokenInfo[] = tokens.map((token, i: number) => {
    const l2GatewayAddress = token.joinTableEntry[0].gateway.gatewayAddr;
    const address = l2Addresses[i];
    let { name:_name, decimals, symbol:_symbol } = tokenData[i];
    const name = sanitizeString(_name)
    const symbol = sanitizeString(_symbol)

    let arbTokenInfo = {
      chainId: +l2Network.chainID,
      address: address,
      name,
      symbol,
      decimals,
      extensions: {
        bridgeInfo: {
          [l1Network.chainID]: {
            tokenAddress: token.l1TokenAddr,
            originBridgeAddress: l2GatewayAddress,
            destBridgeAddress: l2ToL1GatewayAddresses[l2GatewayAddress.toLowerCase()]
          }
        }
      }
    };
    if (logoUris[i]) {
      arbTokenInfo = { ...{ logoURI: logoUris[i] }, ...arbTokenInfo };
    } else {
      console.log('no logo uri for ',token.l1TokenAddr, symbol);
      
    }

    return arbTokenInfo;
  }).filter((tokenInfo: ArbTokenInfo)=>{
    return tokenInfo.extensions && tokenInfo.extensions.bridgeInfo[l1Network.chainID].originBridgeAddress !== "0x0000000000000000000000000000000000000001" 
  })
  tokenList.sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

  console.log(`List has ${tokenList.length} bridged tokens`);

  if(options && options.includeUnbridgedL1Tokens){
    const l1AddressesOfBridgedTokens = new Set(tokens.map((token)=> token.l1TokenAddr.toLowerCase()))
    const unbridgedL1Tokens:ArbTokenInfo[] = options.includeUnbridgedL1Tokens.filter((l1TokenInfo)=>{
      return !l1AddressesOfBridgedTokens.has(l1TokenInfo.address.toLowerCase())
    }).map((l1TokenInfo)=>{
      return {
        chainId: +l1Network.chainID,
        name: l1TokenInfo.name,
        address: l1TokenInfo.address,
        symbol: l1TokenInfo.symbol,
        decimals: l1TokenInfo.decimals,
        logoURI: l1TokenInfo.logoURI

      }
    }).sort((a, b) => (a.symbol < b.symbol ? -1 : 1))
    console.log(`List has ${unbridgedL1Tokens.length} unbridged tokens`);
    
    tokenList = tokenList.concat(unbridgedL1Tokens)
  }

  const version = (()=>{
    if(prevArbTokenList){
      // @ts-ignore
      let versionBump = minVersionBump(prevArbTokenList.tokens, tokenList)

      // tmp: library doesn't nicely handle patches (for extensions object)
      if(versionBump === VersionUpgrade.PATCH){
        versionBump = VersionUpgrade.NONE
      }
      return nextVersion(prevArbTokenList.version, versionBump)  
    }
    return  {
      major: 1,
      minor: 0,
      patch: 0,
    }
  })()

  const arbTokenList: ArbTokenList = {
    name: listNameToArbifiedListName(name),
    timestamp: new Date().toISOString(),
    version,
    tokens: tokenList,
    logoURI: mainLogoUri
  };
  validateTokenListWithErrorThrowing(arbTokenList);

 console.log(`Generated list with total ${arbTokenList.tokens.length} tokens`);
 console.log('version:', version);
 
  
  return arbTokenList;
};

export const arbifyL1List = async (pathOrUrl: string) => {
  const l1TokenList = await getTokenListObj(pathOrUrl);
  const path = process.env.PWD +
  '/src/ArbTokenLists/' +
  listNameToFileName(l1TokenList.name);
  let prevArbTokenList: ArbTokenList | undefined; 

  if(existsSync(path)){
    const data = readFileSync(path)
    console.log('Prev version of Arb List found');
    
    prevArbTokenList =  JSON.parse(data.toString()) as ArbTokenList
    isArbTokenList(prevArbTokenList)
  } 

  const l1Addresses = l1TokenList.tokens.map((token) =>
    token.address.toLowerCase()
  );

  const newList = await generateTokenList(l1Addresses, l1TokenList.name, l1TokenList.logoURI, prevArbTokenList, {
    includeUnbridgedL1Tokens: l1TokenList.tokens
  });

  writeFileSync(path, JSON.stringify(newList));
  console.log('Token list generated at', path );
  
};

export const updateArbifiedList = async (pathOrUrl: string) => {
  // @ts-ignore
  const arbTokenList:ArbTokenList = await getTokenListObj(pathOrUrl);
  const path = process.env.PWD +
  '/src/ArbTokenLists/' +
  listNameToFileName(arbTokenList.name);
  let prevArbTokenList: ArbTokenList | undefined; 

  if(existsSync(path)){
    const data = readFileSync(path)
    console.log('Prev version of Arb List found');
    
    prevArbTokenList =  JSON.parse(data.toString()) as ArbTokenList
    isArbTokenList(prevArbTokenList)
  } 

  //@ts-ignore
  const l1Addresses = arbTokenList.tokens.map((token) =>token.extensions.l1Address);

  const newList = await generateTokenList(l1Addresses, arbTokenList.name, arbTokenList.logoURI, prevArbTokenList);

  writeFileSync(path, JSON.stringify(newList));
  console.log('Token list generated at', path );
  
};


export const updateLogoURIs = async (path: string)=> {
  const data = readFileSync(path)
  const prevArbTokenList =  JSON.parse(data.toString()) as ArbTokenList
  const tokens:any = []
  for (let i = 0; i < prevArbTokenList.tokens.length; i++) {
    const tokenInfo = {...prevArbTokenList.tokens[i]}

    // @ts-ignore
    const logoURI = await getLogoUri(tokenInfo.extensions.l1Address)
    if(logoURI){
      tokenInfo.logoURI = logoURI
    } else {
      console.log('not found:', tokenInfo);
      delete  tokenInfo.logoURI 
    }
    tokens.push(tokenInfo) 
  }

  const newArbList = {...prevArbTokenList, ...{tokens: tokens}}
  writeFileSync(path, JSON.stringify(newArbList));

}

export const arbListtoEtherscanList = (
  arbList: ArbTokenList
): EtherscanList => {
  const list: EtherscanList = [];
  arbList.tokens.forEach(tokenInfo => {
    const { address: l2Address } = tokenInfo;
    if (tokenInfo.extensions) {
      // This assumes one origin chain; should be chill
      const originChainID = Object.keys(tokenInfo.extensions.bridgeInfo)[0];
      const { tokenAddress, originBridgeAddress, destBridgeAddress } =
        tokenInfo.extensions.bridgeInfo[originChainID];
      const data = {
        l1Address: tokenAddress,
        l2Address,
        l1GatewayAddress: destBridgeAddress,
        l2GatewayAddress: originBridgeAddress
      };
      list.push(data);
    }
  });
  return list;
};

