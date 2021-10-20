import args from './getClargs';

import { request, gql } from 'graphql-request';
import { L1GatewayRouter__factory, ERC20__factory } from 'arb-ts';
import { instantiateBridge } from './instantiate_bridge';
import { ArbTokenList } from './types';
import { excludeList } from './utils';
import axios from 'axios';

const getLogoUri = async (l1TokenAddress: string, zapperLogoUris: any) => {
  const l1TokenAddressLCase = l1TokenAddress.toLowerCase();
  const zapperUri = zapperLogoUris[l1TokenAddressLCase];

  if (zapperUri) {
    try {
      const res = await axios.get(zapperUri);
      if (res.status === 200) {
        return zapperUri;
      }
    } catch (e) {
      // zapper uri not found
    }
  }
  const trustWalletUri = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${l1TokenAddress}/logo.png`;

  try {
    const res = await axios.get(trustWalletUri);
    if (res.status === 200) {
      return trustWalletUri;
    }
  } catch (e) {
    // trustwallet uri not found
  }
  console.log('Could not get icon for', l1TokenAddress);

  return;
};

const apolloL2GatewaysRinkebyClient =
  'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-rinkeby';
const apolloL2GatewaysClient =
  'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway';

const iface = L1GatewayRouter__factory.createInterface();
const tokenIface = ERC20__factory.createInterface();
// @ts-ignore
// TODO
// TODO: token return type typescript interrace

interface GatewayAddressMap {
  [key: string]: string;
}
const l2ToL1GatewayAddresses: GatewayAddressMap = {};

const clientURL = apolloL2GatewaysClient;

export const getAllTokens = async () => {
  const bridgeData = await instantiateBridge();
  const { bridge, l1Network, l2Network } = bridgeData;

  const query = gql`
    {
      tokens {
        id
        l2Address
        gateway {
          id
        }
      }
    }
  `;

  let { tokens } = await request(clientURL, query);
  tokens = tokens.filter(
    (token: any) => !excludeList.includes(token.id.toLowerCase())
  );

  const zapperLogoUris = (
    (await axios.get('https://zapper.fi/api/token-list')) as any
  ).data.tokens.reduce((acc: any, currentToken: any) => {
    return {
      ...acc,
      [currentToken.address.toLocaleLowerCase()]: currentToken.logoURI,
    };
  }, {});
  console.log('zap', zapperLogoUris);

  // get l2 addresses

  // l2 address calls:

  const calls = tokens.map((token: any) => {
    return {
      target: l1Network.tokenBridge.l1GatewayRouter,
      funcFragment: iface.functions['calculateL2TokenAddress(address)'],
      values: [token.id],
    };
  });
  const l2Addresses = await bridge.l1Bridge.getMulticallAggregate(calls);
  const _l2Addresses = l2Addresses.map((m, i) => {
    const x = l2Addresses && l2Addresses[i] && l2Addresses[i];
    return (x && (x[0] as string)) || '';
  });

  const l2Calls = _l2Addresses
    .map((l2Address) => {
      return [
        {
          target: l2Address,
          funcFragment: tokenIface.functions['symbol()'],
        },
        {
          target: l2Address,
          funcFragment: tokenIface.functions['decimals()'],
        },
        {
          target: l2Address,
          funcFragment: tokenIface.functions['name()'],
        },
      ];
    })
    .flat();
  const l2Data = await bridge.l2Bridge.getMulticallAggregate(l2Calls);
  const tokenData: {
    symbol: string;
    decimals: number;
    name: string;
  }[] = [];

  // unflatten
  for (let i = 0; i < l2Data.length; i += 3) {
    // @ts-ignore
    const symbol = (l2Data && l2Data[i] && (l2Data[i][0] as string)) || '';
    // @ts-ignore
    const decimals =
      (l2Data && l2Data[i + 1] && (l2Data[i + 1][0] as number)) || 0;
    // @ts-ignore
    const name =
      (l2Data && l2Data[i + 2] && (l2Data[i + 2][0] as string)) || '';

    // @ts-ignore
    tokenData.push({
      symbol,
      decimals,
      name,
    });
  }

  const logoUris: string[] = [];
  for (const token of tokens) {
    const uri = (await getLogoUri(token.id, zapperLogoUris)) as string;
    logoUris.push(uri);
  }

  const tokenList = tokens.map((token: any, i: number) => {
    const l2GatewayAddress = token.gateway[0].id.slice(0, 42);
    const address = _l2Addresses[i];
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

  const ftokenList: ArbTokenList = {
    name: l2Network.name,
    timestamp: new Date().toISOString(),
    version: {
      major: 0,
      minor: 0,
      patch: 0,
    },
    tokens: tokenList,
  };
  return ftokenList;
};
