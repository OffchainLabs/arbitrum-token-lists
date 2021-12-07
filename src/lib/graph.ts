import { request, gql } from 'graphql-request';
import { excludeList } from './utils';
import { GraphTokensResult } from './types'

const apolloL2GatewaysRinkebyClient =
  'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-rinkeby';
const apolloL2GatewaysClient =
  'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway';

const chaidIdToGraphClientUrl = (chainID: string) => {
  switch (chainID) {
    case '42161':
      return apolloL2GatewaysClient;
    case '421611':
      return apolloL2GatewaysRinkebyClient;
    default:
      throw new Error('Unsupported chain');
  }
};
export const getTokens = async (
  l1TokenAddresses: string[],
  networkID: string
) => {
  const clientUrl = chaidIdToGraphClientUrl(networkID);
  // lazy solution for big lists for now; we'll have to paginate once we have > 500 tokens registed
  if (l1TokenAddresses.length > 500){
    const allTokens = await getAllTokens(networkID)
    const allTokenAddresses = new Set(allTokens.map((token)=> token.l1TokenAddr.toLowerCase()))
    l1TokenAddresses = l1TokenAddresses.filter((addr)=> allTokenAddresses.has(addr.toLowerCase()))
    if(l1TokenAddresses.length > 500) throw new Error("Too many tokens for graph query")
  }  
  const formattedAddresses = l1TokenAddresses
    .map((a: string) => `"${a}"`.toLowerCase())
    .join(',');
  const query = gql`
  {
    tokens(first: 500, skip: 0, where:{
      id_in:[${formattedAddresses}]
    }) {
      l1TokenAddr: id
      joinTableEntry: gateway(
        first: 1
        orderBy: blockNum
        orderDirection: desc
      ) {
        id
        blockNum
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
  console.log('tokens');
  
  const { tokens } = await request(clientUrl, query)  as GraphTokensResult
  
  return tokens.filter(
    (token) => !excludeList.includes(token.l1TokenAddr.toLowerCase())
  );
};

export const getAllTokens = async (networkID: string) => {
  const clientUrl = chaidIdToGraphClientUrl(networkID);
  const query = gql`
    {
      tokens(first: 500, skip: 0) {
        l1TokenAddr: id
      joinTableEntry: gateway(
        first: 1
        orderBy: blockNum
        orderDirection: desc
      ) {
        id
        blockNum
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

  const { tokens } = await request(clientUrl, query) as GraphTokensResult
  

  return tokens.filter(
    (token) => !excludeList.includes(token.l1TokenAddr.toLowerCase())
  );
};
