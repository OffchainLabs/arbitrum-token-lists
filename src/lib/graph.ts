import { request, gql } from 'graphql-request';
import { excludeList } from './utils';
import { GraphTokenResult, GraphTokensResult } from './types'

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

const isGraphTokenResult = (obj: any)=>{
  if(!obj){
    throw new Error("Graph result: undefined")
  }
  const expectedKeys = ["joinTableEntry", "l1TokenAddr"]
  const actualKeys = new Set(Object.keys(obj))

  if(!expectedKeys.every((key)=> actualKeys.has(key))){
    throw new Error("Graph result: missing top level key")
  }
  const joinTableEntry = obj.joinTableEntry[0]
  if(!joinTableEntry){
    throw new Error("Graph result: no joinTableEntry")
  }
  if(!joinTableEntry.gateway.gatewayAddr){
    throw new Error("Graph result: could not get gateway address")
  }
}
export const getTokens = async (
  tokenList: {addr: string, logo: string | undefined}[],
  _networkID: string | number
): Promise<Array<GraphTokenResult>> => {
  const networkID = typeof _networkID === 'number' ? _networkID.toString(): _networkID
  const clientUrl = chaidIdToGraphClientUrl(networkID);
  // lazy solution for big lists for now; we'll have to paginate once we have > 500 tokens registed
  if (tokenList.length > 500){
    const allTokens = await getAllTokens(networkID)
    const allTokenAddresses = new Set(allTokens.map((token)=> token.l1TokenAddr.toLowerCase()))
    tokenList = tokenList.filter((token)=> allTokenAddresses.has(token.addr.toLowerCase()))
    if(tokenList.length > 500) throw new Error("Too many tokens for graph query")
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

  const logos = tokenList.reduce(
    (acc, curr) => ((acc[curr.addr.toLowerCase()] = curr.logo), acc),
    {} as { [addr: string]: string | undefined }
  );
  
  const { tokens } = await request(clientUrl, query) as GraphTokensResult
  const res = tokens.map((token)=> {
    isGraphTokenResult(token)
    const logoUri = logos[token.l1TokenAddr] || token.logoUri
    return {
      ...token,
      logoUri: logoUri
    }
  })

  return res.filter(
    (token) => !excludeList.includes(token.l1TokenAddr.toLowerCase())
  );
};

export const getAllTokens = async (
  _networkID: string | number
): Promise<Array<GraphTokenResult>> => {
  const networkID =
    typeof _networkID === "number" ? _networkID.toString() : _networkID;
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

  const { tokens } = (await request(clientUrl, query)) as GraphTokensResult;
  const res = tokens.map((token) => {
    isGraphTokenResult(token);
    return { ...token, logoUri: undefined };
  });

  return res.filter(
    (token) => !excludeList.includes(token.l1TokenAddr.toLowerCase())
  );
};
