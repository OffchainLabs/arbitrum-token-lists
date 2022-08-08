import {  minVersionBump, nextVersion, VersionUpgrade, TokenList } from '@uniswap/token-lists';
import { getAllTokens, getTokens } from './graph';
import { constants, utils } from 'ethers'

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
import { addCustomNetwork, constants as arbConstants, L2Network } from "@arbitrum/sdk"
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

// nova
const l2ToL1GatewayAddressesNova: L2ToL1GatewayAddresses = {
  // L2 ERC20 Gateway	mainnet
  '0xcF9bAb7e53DDe48A6DC4f286CB14e05298799257':
    '0xB2535b988dcE19f9D71dfB22dB6da744aCac21bf',
  // L2 Arb-Custom Gatewa	mainnet
    '0xbf544970E6BD77b21C6492C281AB60d0770451F4':
    '0x23122da8C581AA7E0d07A36Ff1f16F799650232f',
  // L2 weth mainnet
  '0x7626841cB6113412F9c88D3ADC720C9FAC88D9eD':
    '0xE4E2121b479017955Be0b175305B35f312330BaE',
};

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60

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
    getAllTokensInNetwork?: boolean,
    includeOldDataFields?: boolean,
    isNova?: boolean
  }
) => {
  if(options?.includeAllL1Tokens && options.includeUnbridgedL1Tokens) {
    throw new Error("Cannot include both of AllL1Tokens and UnbridgedL1Tokens since UnbridgedL1Tokens is a subset of AllL1Tokens.")
  }

  const name = l1TokenList.name
  const mainLogoUri = l1TokenList.logoURI

  if(options?.isNova){
    const AnyTrust: L2Network = {
      chainID: 42170,
      confirmPeriodBlocks: 45818,
      ethBridge: {
        bridge: '0xc1ebd02f738644983b6c4b2d440b8e77dde276bd',
        inbox: '0xc4448b71118c9071bcb9734a0eac55d18a153949',
        outbox: '0xD4B80C3D7240325D18E645B49e6535A3Bf95cc58',
        rollup: '0xfb209827c58283535b744575e11953dcc4bead88',
        sequencerInbox: '0x211e1c4c7f1bf5351ac850ed10fd68cffcf6c21b'
      },
      explorerUrl: 'https://a4ba-explorer.arbitrum.io',
      isArbitrum: true,
      isCustom: true,
      name: 'AnyTrust',
      partnerChainID: 1,
      retryableLifetimeSeconds: SEVEN_DAYS_IN_SECONDS,
      rpcURL: 'https://a4ba.arbitrum.io/rpc',
      tokenBridge: {
        l1CustomGateway: '0x23122da8C581AA7E0d07A36Ff1f16F799650232f',
        l1ERC20Gateway: '0xB2535b988dcE19f9D71dfB22dB6da744aCac21bf',
        l1GatewayRouter: '0xC840838Bc438d73C16c2f8b22D2Ce3669963cD48',
        l1MultiCall: '0x8896d23afea159a5e9b72c9eb3dc4e2684a38ea3',
        l1ProxyAdmin: '0xa8f7DdEd54a726eB873E98bFF2C95ABF2d03e560',
        l1Weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        l1WethGateway: '0xE4E2121b479017955Be0b175305B35f312330BaE',
        l2CustomGateway: '0xbf544970E6BD77b21C6492C281AB60d0770451F4',
        l2ERC20Gateway: '0xcF9bAb7e53DDe48A6DC4f286CB14e05298799257',
        l2GatewayRouter: '0x21903d3F8176b1a0c17E953Cd896610Be9fFDFa8',
        l2Multicall: '0x5e1eE626420A354BbC9a95FeA1BAd4492e3bcB86',
        l2ProxyAdmin: '0xada790b026097BfB36a5ed696859b97a96CEd92C',
        l2Weth: '0x722E8BdD2ce80A4422E880164f2079488e115365',
        l2WethGateway: '0x7626841cB6113412F9c88D3ADC720C9FAC88D9eD'
      }
    }
    addCustomNetwork({customL2Network: AnyTrust});
  }

  const { l1 , l2 } = await getNetworkConfig();

  let tokens =
    options && options.getAllTokensInNetwork
      ? await getAllTokens(l2.network.chainID)
      : await getTokens(
          l1TokenList.tokens.map((token) => ({
            addr: token.address.toLowerCase(),
            logo: token.logoURI
          })),
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
  const logoUris: { [l1addr: string]: string } = {};
  for (const token of tokens) {
    const uri = token.logoUri || await getLogoUri(token.l1TokenAddr);
    if (uri) logoUris[token.l1TokenAddr] = uri;
  }

  let arbifiedTokenList:ArbTokenInfo[] = tokens
      .map((t, i) => ({token: t, l2Address: l2AddressesFromL2[i], tokenDatum: tokenData[i]}))
      // it's possible that even though l2AddressesFromL1[i] === l2AddressesFromL2[i] these addresses could be the zero address
      // this can happen if the graphql query returns an address that hasnt been bridged
      .filter((t): t is typeof t & { l2Address: string } => t.l2Address != undefined && t.l2Address !== constants.AddressZero)
      .map((token, i: number) => {
    const l2GatewayAddress = token.token.joinTableEntry[0].gateway.gatewayAddr;
    let { name:_name, decimals, symbol:_symbol } = token.tokenDatum;
    
    if(decimals === undefined) throw new Error(`Unexpected undefined token decimals: ${JSON.stringify(token)}`);

    _name = (() => {
      if(_name === undefined) throw new Error(`Unexpected undefined token name: ${JSON.stringify(token)}`);
      // if token name is empty, instead set the address as the name
      // we remove the initial 0x since the token list standard only allows up to 40 characters
      else if(_name === "") return token.token.l1TokenAddr.substring(2)
      // parse null terminated bytes32 strings
      else if(_name.length === 64) return utils.parseBytes32String("0x" + _name)
      else return _name;
    })()

    _symbol = (() => {
      if(_symbol === undefined) throw new Error(`Unexpected undefined token symbol: ${JSON.stringify(token)}`);
      // schema doesn't allow for empty symbols, and has a max length of 20
      else if (_symbol === "") return _name.substring(0, Math.min(_name.length, 20));
      // parse null terminated bytes32 strings
      else if (_symbol.length === 64) return utils.parseBytes32String("0x" + _symbol);
      else return _symbol;
    })()

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
    if(options && options.includeOldDataFields){
      arbTokenInfo.extensions = {
        ...arbTokenInfo.extensions,
        // @ts-ignore
        l1Address: token.token.l1TokenAddr,
        l2GatewayAddress: l2GatewayAddress,
        l1GatewayAddress: l2ToL1GatewayAddresses[l2GatewayAddress.toLowerCase()]
      }
    }
    if (logoUris[token.token.l1TokenAddr]) {
      arbTokenInfo = { ...{ logoURI: logoUris[token.token.l1TokenAddr] }, ...arbTokenInfo };
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
    (l1TokenInfo) => l1TokenInfo.chainId !== l2.network.chainID
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

  const validationTokenList: ArbTokenList = {
    ...arbTokenList,
    tokens: arbTokenList.tokens
  };
  validateTokenListWithErrorThrowing(validationTokenList);

  console.log(`Generated list with total ${arbTokenList.tokens.length} tokens`);
  console.log('version:', version);
  
  return arbTokenList;
};

export const arbifyL1List = async (pathOrUrl: string, includeOldDataFields?:boolean, isNova?: boolean) => {
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
    includeAllL1Tokens: true,
    includeOldDataFields,
    isNova: isNova
  });

  writeFileSync(path, JSON.stringify(newList));
  console.log('Token list generated at', path );
  
};

export const updateArbifiedList = async (pathOrUrl: string, isNova?: boolean) => {
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
    includeAllL1Tokens: true,
    isNova: isNova
  });

  writeFileSync(path, JSON.stringify(newList));
  console.log('Token list generated at', path );
  
};


// export const updateLogoURIs = async (path: string)=> {
//   const data = readFileSync(path)
//   const prevArbTokenList =  JSON.parse(data.toString()) as ArbTokenList
//   const tokens:any = []
//   for (let i = 0; i < prevArbTokenList.tokens.length; i++) {
//     const tokenInfo = {...prevArbTokenList.tokens[i]}

//     // @ts-ignore
//     const logoURI = await getLogoUri(tokenInfo.extensions.l1Address)
//     if(logoURI){
//       tokenInfo.logoURI = logoURI
//     } else {
//       console.log('not found:', tokenInfo);
//       delete  tokenInfo.logoURI 
//     }
//     tokens.push(tokenInfo) 
//   }

//   const newArbList = {...prevArbTokenList, ...{tokens: tokens}}
//   writeFileSync(path, JSON.stringify(newArbList));

// }

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

