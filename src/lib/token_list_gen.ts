import {  minVersionBump, nextVersion, VersionUpgrade, TokenList } from '@uniswap/token-lists';
import { getAllTokens, getTokens } from './graph';
import { constants } from 'ethers'

import { ArbTokenList, ArbTokenInfo, EtherscanList, GraphTokenResult } from './types';
import {
  getL2TokenAddressesFromL1,
  getL2TokenAddressesFromL2,
  getLogoUri,
  getTokenListObj,
  listNameToFileName,
  validateTokenListWithErrorThrowing,
  sanitizeString,
  listNameToArbifiedListName,
  isArbTokenList,
  removeInvalidTokensFromList
} from './utils';
import { constants as arbConstants } from "arb-ts"
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { getNetworkConfig } from './instantiate_bridge';

export interface ArbificationOptions {
  overwriteCurrentList: boolean;
}

export interface L2ToL1GatewayAddresses {
  [contractAddress: string]: string;
}

// TODO: read these values from the gateway or a subgraph
const l2ToL1GatewayAddresses: L2ToL1GatewayAddresses = {
  // L2 ERC20 Gateway	mainnet
  '0x09e9222e96e7b4ae2a407b98d48e330053351eee':
    '0xa3A7B6F88361F48403514059F1F16C8E78d60EeC',
  // L2 Arb-Custom Gateway	mainnet
    '0x096760f208390250649e3e8763348e783aef5562':
    '0xcEe284F754E854890e311e3280b767F80797180d',
  // L2 weth mainnet
  '0x6c411ad3e74de3e7bd422b94a27770f5b86c623b':
    '0xd92023E9d9911199a6711321D1277285e6d4e2db',
  // L2 dai gateway mainnet
  '0x467194771dae2967aef3ecbedd3bf9a310c76c65':
    '0xd3b5b60020504bc3489d6949d545893982ba3011',
  // L2 ERC20 Gateway	rinkeby
    "0x195c107f3f75c4c93eba7d9a1312f19305d6375f": "0x91169Dbb45e6804743F94609De50D511C437572E",
  // L2 Arb-Custom Gateway	rinkeby
    "0x9b014455acc2fe90c52803849d0002aeec184a06":"0x917dc9a69F65dC3082D518192cd3725E1Fa96cA2",
  // L2 Weth Gateway rinkeby
    "0xf94bc045c4e926cc0b34e8d1c41cd7a043304ac9": "0x81d1a19cf7071732D4313c75dE8DD5b8CF697eFD",
  // old L2 weth gateway in rinkeby? we can prob remove this
    "0xf90eb31045d5b924900aff29344deb42eae0b087": "0x81d1a19cf7071732D4313c75dE8DD5b8CF697eFD",
  // livepeer gateway mainnet
  "0x6d2457a4ad276000a615295f7a80f79e48ccd318": "0x6142f1C8bBF02E6A6bd074E8d564c9A5420a0676"
};

export const generateTokenList = async (
  l1TokenList: TokenList,
  prevArbTokenList?: ArbTokenList,
  options?: {
    /**
     * Append all tokens from the original l1TokenList to the output list.
     */
    includeAllL1Tokens?: boolean,
    /**
     * Append all unbridged tokens from original l1TokenList to the output list.
     */
    includeUnbridgedL1Tokens?: boolean,
    getAllTokensInNetwork?: boolean
  }
) => {
  if(options?.includeAllL1Tokens && options.includeUnbridgedL1Tokens) {
    throw new Error("Cannot include both of AllL1Tokens and UnbridgedL1Tokens since UnbridgedL1Tokens is a subset of AllL1Tokens.")
  }

  const name = l1TokenList.name
  const mainLogoUri = l1TokenList.logoURI

  const { l1 , l2 } = await getNetworkConfig();

  let tokens =
    options && options.getAllTokensInNetwork
      ? await getAllTokens(l2.network.chainID)
      : await getTokens(
          l1TokenList.tokens.map((token) => token.address.toLowerCase()),
          l2.network.chainID
        );

  
  const l1TokenAddresses = tokens.map((token:GraphTokenResult) => token.l1TokenAddr);
  const l2AddressesFromL1 = await getL2TokenAddressesFromL1(l1TokenAddresses, l1.multiCaller, l2.network.tokenBridge.l1GatewayRouter);
  const l2AddressesFromL2 = await getL2TokenAddressesFromL2(l1TokenAddresses, l2.multiCaller, l2.network.tokenBridge.l2GatewayRouter);

  // if the l2 route hasn't been updated yet we remove the token from the bridged tokens
  tokens = tokens.filter((t, i) => l2AddressesFromL1[i] === l2AddressesFromL2[i])

  const tokenData = await l2.multiCaller.getTokenData(
    l2AddressesFromL1.map(t => t || constants.AddressZero),
    { name: true, decimals: true, symbol: true }
  )
  const logoUris: (string | undefined)[] = [];
  for (const token of tokens) {
    const uri = await getLogoUri(token.l1TokenAddr);
    logoUris.push(uri);
  }

  let arbifiedTokenList:ArbTokenInfo[] = tokens
      .map((t, i) => ({token: t, l2Address: l2AddressesFromL2[i], tokenDatum: tokenData[i]}))
      // it's possible that even though l2AddressesFromL1[i] === l2AddressesFromL2[i] these addresses could be the zero address
      // this can happen if the graphql query returns an address that hasnt been bridged
      .filter((t): t is typeof t & { l2Address: string } => t.l2Address != undefined && t.l2Address !== constants.AddressZero)
      .map((token, i: number) => {
    const l2GatewayAddress = token.token.joinTableEntry[0].gateway.gatewayAddr;
    let { name:_name, decimals, symbol:_symbol } = token.tokenDatum;
    
    if(_name === undefined || _name === null) throw new Error(`Unexpected undefined token name: ${JSON.stringify(token)}`);
    if(decimals === undefined || decimals === null) throw new Error(`Unexpected undefined token decimals: ${JSON.stringify(token)}`);
    if(_symbol === undefined || _symbol === null) throw new Error(`Unexpected undefined token symbol: ${JSON.stringify(token)}`);
    
    // if token name is empty, instead set the address as the name
    // we remove the initial 0x since the token list standard only allows up to 40 characters
    _name = _name === "" ? token.token.l1TokenAddr.substring(2) : _name;
    const name = sanitizeString(_name)
    const symbol = sanitizeString(_symbol)

    let arbTokenInfo = {
      chainId: +l2.network.chainID,
      address: token.l2Address,
      name,
      symbol,
      decimals,
      extensions: {
        bridgeInfo: {
          [l1.network.chainID]: {
            tokenAddress: token.token.l1TokenAddr,
            originBridgeAddress: l2GatewayAddress,
            destBridgeAddress: l2ToL1GatewayAddresses[l2GatewayAddress.toLowerCase()]
          }
        }
      }
    };
    if (logoUris[i]) {
      arbTokenInfo = { ...{ logoURI: logoUris[i] }, ...arbTokenInfo };
    } else {
      console.log('no logo uri for ',token.token.l1TokenAddr, symbol);
      
    }

    return arbTokenInfo;
  }).filter((tokenInfo: ArbTokenInfo)=>{
    return tokenInfo.extensions && tokenInfo.extensions.bridgeInfo[l1.network.chainID].originBridgeAddress !== arbConstants.DISABLED_GATEWAY 
  })
  arbifiedTokenList.sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

  console.log(`List has ${arbifiedTokenList.length} bridged tokens`);

  const allOtherTokens = l1TokenList.tokens.filter(
    (l1TokenInfo) => l1TokenInfo.chainId !== parseInt(l2.network.chainID)
  ).map((l1TokenInfo)=>{
      return {
        chainId: +l1TokenInfo.chainId,
        name: l1TokenInfo.name,
        address: l1TokenInfo.address,
        symbol: l1TokenInfo.symbol,
        decimals: l1TokenInfo.decimals,
        logoURI: l1TokenInfo.logoURI
      }
  })

  if(options?.includeAllL1Tokens) {
    arbifiedTokenList = arbifiedTokenList.concat(allOtherTokens)
  } else if(options?.includeUnbridgedL1Tokens) {
    const l1AddressesOfBridgedTokens = new Set(tokens.map((token)=> token.l1TokenAddr.toLowerCase()))
    const unbridgedTokens = allOtherTokens.filter((l1TokenInfo)=>{
      return !l1AddressesOfBridgedTokens.has(l1TokenInfo.address.toLowerCase()) && l1TokenInfo.chainId === +l1.network.chainID
    }).sort((a, b) => (a.symbol < b.symbol ? -1 : 1))
    console.log(`List has ${unbridgedTokens.length} unbridged tokens`);

    arbifiedTokenList = arbifiedTokenList.concat(unbridgedTokens)
  }

  const version = (()=>{
    if(prevArbTokenList){
      // @ts-ignore
      let versionBump = minVersionBump(prevArbTokenList.tokens, arbifiedTokenList)

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
    tokens: arbifiedTokenList,
    logoURI: mainLogoUri
  };

  // some tokens use an old name with doesnt validate - eg maker
  // which has the name in hex
  const makerName = "4d616b6572000000000000000000000000000000000000000000000000000000"
  const validationTokenList: ArbTokenList = {
    ...arbTokenList,
    tokens: arbTokenList.tokens.filter(t => t.name !== makerName)
  };
  validateTokenListWithErrorThrowing(validationTokenList);

  console.log(`Generated list with total ${arbTokenList.tokens.length} tokens`);
  console.log('version:', version);
  
  return arbTokenList;
};

export const arbifyL1List = async (pathOrUrl: string) => {
  const l1TokenList = await getTokenListObj(pathOrUrl);
  removeInvalidTokensFromList(l1TokenList)
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

  const newList = await generateTokenList(l1TokenList, prevArbTokenList, {
    includeAllL1Tokens: true
  });

  writeFileSync(path, JSON.stringify(newList));
  console.log('Token list generated at', path );
  
};

export const updateArbifiedList = async (pathOrUrl: string) => {
  const arbTokenList = await getTokenListObj(pathOrUrl);
  removeInvalidTokensFromList(arbTokenList)
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

  const newList = await generateTokenList(arbTokenList, prevArbTokenList, { 
    includeAllL1Tokens: true
  });

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

