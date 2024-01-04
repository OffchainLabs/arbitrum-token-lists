import { request, gql } from 'graphql-request';
import { isNetwork } from './utils';
import { GraphTokenResult, GraphTokensResult } from './types';
import { excludeList } from './constants';

const apolloL2GatewaysRinkebyClient =
  'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-rinkeby';
const apolloL2GatewaysClient =
  'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway';
const apolloL2GatewaysGoerliRollupClient =
  'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-nitro-goerli';
const apolloL2GatewaysSepoliaClient =
  'https://api.thegraph.com/subgraphs/name/fionnachan/layer2-token-gateway-sepolia';

const chainIdToGraphClientUrl = (chainID: string) => {
  switch (chainID) {
    case '42161':
      return apolloL2GatewaysClient;
    case '421611':
      return apolloL2GatewaysRinkebyClient;
    case '421613':
      return apolloL2GatewaysGoerliRollupClient;
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

/**  421613 subgraph uses a different field name */
const graphGatewayBlockNumField = (networkID: string | number) => {
  return +networkID === 421613 ? 'l2BlockNum' : 'blockNum';
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
  const blockNumber = graphGatewayBlockNumField(_networkID);
  const query = gql`
  {
    tokens(first: 500, skip: 0, where:{
      id_in:[${formattedAddresses}]
    }) {
      l1TokenAddr: id
      joinTableEntry: gateway(
        first: 1
        orderBy: ${blockNumber}
        orderDirection: desc
      ) {
        id
        ${blockNumber}
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
  const blockNumber = graphGatewayBlockNumField(_networkID);
  const query = gql`
    {
      tokens(first: 500, skip: 0) {
        l1TokenAddr: id
        joinTableEntry: gateway(
          first: 1
          orderBy: ${blockNumber}
          orderDirection: desc
        ) {
          id
          ${blockNumber}
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
