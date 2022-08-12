import Ajv from 'ajv'
import betterAjvErrors from 'better-ajv-errors'
import addFormats from 'ajv-formats'
import { schema, TokenList } from '@uniswap/token-lists'
import { readFileSync, existsSync } from 'fs'
import axios from 'axios'
import { L2Network, MultiCaller } from '@arbitrum/sdk'
import { L1GatewayRouter__factory } from "@arbitrum/sdk/dist/lib/abi/factories/L1GatewayRouter__factory";
import { L2GatewayRouter__factory } from "@arbitrum/sdk/dist/lib/abi/factories/L2GatewayRouter__factory";

import { ArbTokenList } from './types'
import path from 'path'
import yargs from "./getClargs"

export const isNova = yargs.l2NetworkID === 1;

const coinGeckoBuff = readFileSync(path.resolve(__dirname, '../Assets/coingecko_uris.json'))
const logoURIsBuff = readFileSync(path.resolve(__dirname, '../Assets/logo_uris.json'))

const coingeckoURIs = JSON.parse(coinGeckoBuff.toString())
const logoUris = JSON.parse(logoURIsBuff.toString())
for (let address of Object.keys(logoUris)) {
  logoUris[address.toLowerCase()] = logoUris[address]
}

export const listNameToFileName = (name: string) => {
  const prefix = 'arbed_'
  let fileName = name.split(' ').join('_').toLowerCase() + '.json'
  if (!fileName.startsWith(prefix)) {
    fileName = prefix + fileName
  }
  return fileName
}

export const listNameToArbifiedListName = (name: string) => {
  const prefix = 'Arbed '

  let fileName = sanitizeNameString(name)
  if (!fileName.startsWith(prefix)) {
    fileName = prefix + fileName
  }
  return fileName.split(' ').slice(0, 2).join(' ').slice(0, 20)
}

export const getL2GatewayAddressesFromL1Token = async (
  l1TokenAddresses: string[],
  multiCaller: MultiCaller,
  l2Network: L2Network
) => {
  const iFace = L1GatewayRouter__factory.createInterface();

  const gateways = await multiCaller.multiCall(
    l1TokenAddresses.map((addr) => ({
      encoder: () => iFace.encodeFunctionData("getGateway", [addr]),
      decoder: (returnData: string) => iFace.decodeFunctionResult("getGateway", returnData)[0] as string,
      targetAddr: l2Network.tokenBridge.l2GatewayRouter,
    }))
  );

  for (const curr of gateways) {
    if (typeof curr === "undefined") throw new Error("undefined gateway!");
  }

  return gateways

  // const l2Addrs = await getL2GatewayAddressesFromL1Gateway(
  //   gateways as string[],
  //   multiCaller
  // );

  // const res = l2Addrs.map((_, i) => ({
  //   l1Token: l1TokenAddresses[i],
  //   l1GatewayAddr: gateways[i],
  //   l2GatewayAddr: l2Addrs[i],
  // }));

  // for(const curr of res) {
  //   if(curr.l1Token.toLowerCase() === "0x6B175474E89094C44Da98b954EedeAC495271d0F".toLowerCase()) {
  //     console.log(curr)
  //   }
  // }

  // return res;
};

export const getL2GatewayAddressesFromL1Gateway = async (
  l1RouterAddresses: string[],
  multiCaller: MultiCaller
) => {
  const iFace = L1GatewayRouter__factory.createInterface()

  return await multiCaller.multiCall(
    l1RouterAddresses.map((addr) => ({
      encoder: () =>
        iFace.encodeFunctionData('counterpartGateway'),
      decoder: (returnData: string) =>
        iFace.decodeFunctionResult(
          'calculateL2TokenAddress',
          returnData,
        )[0] as string,
      targetAddr: addr,
    })),
  )
}

export const getL2TokenAddressesFromL1 = async (
  l1TokenAddresses: string[],
  multiCaller: MultiCaller,
  l1GatewayRouterAddress: string,
) => {
  const iFace = L1GatewayRouter__factory.createInterface()

  return await multiCaller.multiCall(
    l1TokenAddresses.map((addr) => ({
      encoder: () =>
        iFace.encodeFunctionData('calculateL2TokenAddress', [addr]),
      decoder: (returnData: string) =>
        iFace.decodeFunctionResult(
          'calculateL2TokenAddress',
          returnData,
        )[0] as string,
      targetAddr: l1GatewayRouterAddress,
    })),
  )
}

export const getL2TokenAddressesFromL2 = async (
  l1TokenAddresses: string[],
  multiCaller: MultiCaller,
  l2GatewayRouterAddress: string,
) => {
  const iFace = L2GatewayRouter__factory.createInterface()

  return await multiCaller.multiCall(
    l1TokenAddresses.map((addr) => ({
      encoder: () =>
        iFace.encodeFunctionData('calculateL2TokenAddress', [addr]),
      decoder: (returnData: string) =>
        iFace.decodeFunctionResult(
          'calculateL2TokenAddress',
          returnData,
        )[0] as string,
      targetAddr: l2GatewayRouterAddress,
    })),
  )
}

export const getLogoUri = async (l1TokenAddress: string) => {
  const l1TokenAddressLCase = l1TokenAddress.toLowerCase()
  const logoUri: string | undefined = logoUris[l1TokenAddressLCase]
  const coinGeckoURI: string | undefined = coingeckoURIs[l1TokenAddressLCase]
  const trustWalletUri = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${l1TokenAddress}/logo.png`
  const uris = [logoUri, coinGeckoURI, trustWalletUri].filter(
    (x): x is string => !!x,
  )

  for (const uri of uris) {
    try {
      const res = await axios.get(uri)
      if (res.status === 200) {
        return uri
      }
    } catch (e) {}
  }
  return
}
export const getTokenListObjFromUrl = async (url: string) => {
  return (await axios.get(url)).data as TokenList
}
export const getTokenListObjFromLocalPath = async (path: string) => {
  return JSON.parse(readFileSync(path).toString()) as TokenList
}

export const tokenListIsValid = (tokenList: ArbTokenList | TokenList) => {
  const ajv = new Ajv()
  addFormats(ajv)
  const validate = ajv.compile(schema)

  const res = validate(tokenList)
  if (validate.errors) {
    const output = betterAjvErrors(schema, tokenList, validate.errors, {
      indent: 2,
    })
    console.log(output)
  }

  return res
}

export const validateTokenListWithErrorThrowing = (
  tokenList: ArbTokenList | TokenList,
) => {
  try {
    let valid = tokenListIsValid(tokenList)
    if (valid) return true
    else throw new Error('Data does not conform to token list schema; not sure why')
  } catch(e) {
    console.log('Invalid token list:')
    throw e
  }
}

export const removeInvalidTokensFromList = (tokenList: ArbTokenList | TokenList):ArbTokenList | TokenList  =>{
  let valid = tokenListIsValid(tokenList);
  const startingTokenListLen = tokenList.tokens.length
  
  if (valid) {
    return tokenList;
  } else {
    let tokenListCopy = JSON.parse(JSON.stringify(tokenList)) as typeof tokenList
    console.log("Invalid token list:");
    while (!valid && tokenListCopy.tokens.length > 0){
      const targetToken = tokenListCopy.tokens.pop()
      const tokenTokenIndex = tokenListCopy.tokens.length 
      valid = tokenListIsValid(tokenListCopy);
      if(valid){
        console.log('Invalid token token, removing from list', targetToken);
        
        tokenList.tokens.splice(tokenTokenIndex , 1)
        // pre-recursion sanity check:
        if( tokenList.tokens.length >= startingTokenListLen ){
          throw new Error("666: removeInvalidTokensFromList failed basic sanity check")
        }
        return removeInvalidTokensFromList(tokenList)
      }
    }
    throw new Error('Data does not confirm to token list schema; not sure why');
  }
}

export const getTokenListObj = async (pathOrUrl: string) => {
  const tokenList: TokenList = await (async (pathOrUrl: string) => {
    const localFileExists = existsSync(pathOrUrl)
    const looksLikeUrl = isValidHttpUrl(pathOrUrl)
    if (localFileExists) {
      return getTokenListObjFromLocalPath(pathOrUrl)
    } else if (looksLikeUrl) {
      return await getTokenListObjFromUrl(pathOrUrl)
    } else {
      throw new Error('Could not find token list')
    }
  })(pathOrUrl);
  isTokenList(tokenList)
  return tokenList
};

// https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url

function isValidHttpUrl(urlString: string) {
  let url

  try {
    url = new URL(urlString)
  } catch (_) {
    return false
  }

  return url.protocol === 'http:' || url.protocol === 'https:'
}

// typeguard:
export const isArbTokenList = (obj: any) => {
  const expectedListKeys = ['name', 'timestamp', 'version', 'tokens']
  const actualListKeys = new Set(Object.keys(obj))
  if (!expectedListKeys.every((key) => actualListKeys.has(key))) {
    throw new Error(
      'ArbTokenList typeguard error: requried list key not included',
    )
  }
  const { version, tokens } = obj
  if (
    !['major', 'minor', 'patch'].every((key) => {
      return typeof version[key] === 'number'
    })
  ) {
    throw new Error('ArbTokenList typeguard error: invalid version')
  }
  if (
    !tokens.every((token: any) => {
      const tokenKeys = new Set(Object.keys(token))
      return ['chainId', 'address', 'name', 'decimals', 'symbol'].every(
        (key) => {
          return tokenKeys.has(key)
        },
      )
    })
  ) {
    throw new Error('ArbTokenList typeguard error: token missing required key')
  }
  tokens.forEach((token: any) => {
    if (token.extensions && token.extensions.bridgeInfo) {
      const {
        extensions: { bridgeInfo },
      } = token
      const bridges = Object.keys(bridgeInfo)
      if (!bridges.length) {
        throw new Error('ArbTokenList typeguard error: no bridge info found')
      }
      const someDestinationChain = bridges[0]
      const {
        tokenAddress,
        originBridgeAddress,
        destBridgeAddress,
      } = bridgeInfo[someDestinationChain]

      if (
        ![tokenAddress, originBridgeAddress, destBridgeAddress].every((k) => k)
      ) {
        throw new Error('ArbTokenList typeguard error: missing extension')
      }
    }
  })
}


// typeguard:
export const isTokenList = (obj:any)=>{
  const expectedListKeys = ['name', 'timestamp', 'version', 'tokens']
  const actualListKeys = new Set(Object.keys(obj))
  if(!expectedListKeys.every((key)=>actualListKeys.has(key) )){
    throw new Error("tokenlist typeguard error: requried list key not included")
  }
  const { version, tokens } = obj
  if(!['major','minor', 'patch'].every((key)=>{    
    return typeof version[key] === 'number'
  })){
    throw new Error("tokenlist typeguard error: invalid version")
  }
  if(!tokens.every((token:any)=>{
    const tokenKeys = new Set(Object.keys(token))
    return ['chainId', 'address','name', 'decimals','symbol' ].every((key)=>{
      return tokenKeys.has(key)
    })
  })){
    throw new Error ("tokenlist typeguard error: token missing required key")
  }
}

export const sanitizeNameString = (str: string) =>
  str.replace(/[^ \w.'+\-%/À-ÖØ-öø-ÿ:&\[\]\(\)]/gi, '')

export const sanitizeSymbolString = (str: string) =>
  str.replace(/[^a-zA-Z0-9+\-%/$.]/gi, '')

export const excludeList = [
  '0x0CE51000d5244F1EAac0B313a792D5a5f96931BF', //rkr
  '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f', //in
  '0xEDA6eFE5556e134Ef52f2F858aa1e81c84CDA84b', // bad cap
  '0xe54942077Df7b8EEf8D4e6bCe2f7B58B0082b0cd', // swapr
  '0x282db609e787a132391eb64820ba6129fceb2695', // amy
  '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', // mim
  '0x106538cc16f938776c7c180186975bca23875287', // remove once bridged (basv2)
  '0xB4A3B0Faf0Ab53df58001804DdA5Bfc6a3D59008', // spera
  // "0x960b236a07cf122663c4303350609a66a7b288c0", //aragon old
].map((s) => s.toLowerCase())
