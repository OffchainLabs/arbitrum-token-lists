import { request, gql } from 'graphql-request';
import { isNetwork } from './utils';
import { GraphTokenResult, GraphTokensResult } from './types';
import { excludeList } from './constants';

if (!process.env.L2_GATEWAY_SUBGRAPH_URL) {
  throw new Error('process.env.L2_GATEWAY_SUBGRAPH_URL is not defined');
}
const apolloL2GatewaysClient = process.env.L2_GATEWAY_SUBGRAPH_URL;

if (!process.env.L2_GATEWAY_SEPOLIA_SUBGRAPH_URL) {
  throw new Error('process.env.L2_GATEWAY_SEPOLIA_SUBGRAPH_URL is not defined');
}
const apolloL2GatewaysSepoliaClient =
  process.env.L2_GATEWAY_SEPOLIA_SUBGRAPH_URL;

const chainIdToGraphClientUrl = (chainID: string) => {
  switch (chainID) {
    case '42161':
      return apolloL2GatewaysClient;
    case '421614':
      return apolloL2GatewaysSepoliaClient;
    default:
      throw new Error('Unsupported chain');
  }
};

const isGraphTokenResult = (obj: GraphTokenResult) => {
  if (!obj) {
    throw new Error('Graph result: undefined');
  }
  const expectedKeys = ['joinTableEntry', 'l1TokenAddr'];
  const actualKeys = new Set(Object.keys(obj));

  if (!expectedKeys.every((key) => actualKeys.has(key))) {
    throw new Error('Graph result: missing top level key');
  }
  const joinTableEntry = obj.joinTableEntry[0];
  if (!joinTableEntry) {
    throw new Error('Graph result: no joinTableEntry');
  }
  if (!joinTableEntry.gateway.gatewayAddr) {
    throw new Error('Graph result: could not get gateway address');
  }
};

export const getTokens = async (
  tokenList: { addr: string; logo: string | undefined }[],
  _networkID: string | number,
): Promise<Array<GraphTokenResult>> => {
  const { isNova } = isNetwork();
  if (isNova) {
    console.warn('empty subgraph for nova');
    return [];
  }
  const networkID =
    typeof _networkID === 'number' ? _networkID.toString() : _networkID;
  const clientUrl = chainIdToGraphClientUrl(networkID);
  // lazy solution for big lists for now; we'll have to paginate once we have > 500 tokens registed
  if (tokenList.length > 500) {
    const allTokens = await getAllTokens(networkID);
    const allTokenAddresses = new Set(
      allTokens.map((token) => token.l1TokenAddr.toLowerCase()),
    );
    tokenList = tokenList.filter((token) =>
      allTokenAddresses.has(token.addr.toLowerCase()),
    );
    if (tokenList.length > 500)
      throw new Error('Too many tokens for graph query');
  }
  const formattedAddresses = tokenList
    .map((token) => `"${token.addr}"`.toLowerCase())
    .join(',');
  const query = gql`
  {
    tokens(first: 500, skip: 0, where:{
      id_in:[${formattedAddresses}]
    }) {
      l1TokenAddr: id
      joinTableEntry: gateway(
        first: 1
        orderBy: l2BlockNum
        orderDirection: desc
      ) {
        id
        l2BlockNum
        token {
          tokenAddr: id
        }
        gateway {
          gatewayAddr: id
        }
      }
    }
  }
`;

  const { tokens } = (await request(clientUrl, query)) as GraphTokensResult;
  tokens.map((token) => isGraphTokenResult(token));

  return tokens.filter(
    (token) => !excludeList.includes(token.l1TokenAddr.toLowerCase()),
  );
};

export const getAllTokens = async (
  _networkID: string | number,
): Promise<Array<GraphTokenResult>> => {
  const networkID =
    typeof _networkID === 'number' ? _networkID.toString() : _networkID;
  const clientUrl = chainIdToGraphClientUrl(networkID);
  const query = gql`
    {
      tokens(first: 500, skip: 0) {
        l1TokenAddr: id
        joinTableEntry: gateway(
          first: 1
          orderBy: l2BlockNum
          orderDirection: desc
        ) {
          id
          l2BlockNum
          token {
            tokenAddr: id
          }
          gateway {
            gatewayAddr: id
          }
        }
      }
    }
  `;

  const { tokens } = (await request(clientUrl, query)) as GraphTokensResult;
  const res = tokens.map((token) => {
    isGraphTokenResult(token);
    return { ...token };
  });

  return res.filter(
    (token) => !excludeList.includes(token.l1TokenAddr.toLowerCase()),
  );
};
