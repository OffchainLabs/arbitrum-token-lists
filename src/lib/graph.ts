import { request, gql } from 'graphql-request';
import { isNetwork } from './utils';
import {
  GraphTokenResult,
  GraphTokensResult,
  GatewaySetsResult,
  GatewaySetInfo,
} from './types';
import {
  excludeList,
  tokenGatewayGraphEndpoints,
  bridgeGraphEndpoints,
} from './constants';
import { getArgvs } from './options';

const sortByTime = (a: GatewaySetInfo, b: GatewaySetInfo): number => {
  if (Number(a.blockNumber) === Number(b.blockNumber)) {
    return a.logIndex - b.logIndex;
  }
  return Number(a.blockNumber) - Number(b.blockNumber);
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
  const clientUrl = tokenGatewayGraphEndpoints[Number(networkID)];
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
  const clientUrl = tokenGatewayGraphEndpoints[Number(networkID)];
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


export async function getGatewaysets(): Promise<any[]> {
  const eventResult = [];
  const currentResult: GatewaySetInfo[] = [];
  let skip = 0;
  const clientUrl = bridgeGraphEndpoints[getArgvs().l2NetworkID];
  do {
    const query = gql`query EventQuery {
                gatewaySets(first: 100, orderBy: id, skip: ${skip}) {
                    id 
                    l1Token 
                    gateway
                    blockNumber
                    }   
                }`;
    // const scanResult = await axios.post(
    //   bridgeGraphEndpoints[getArgvs().l2NetworkID],
    //   { query: requestPara },
    // );
    const { gatewaySets } = (await request(
      clientUrl,
      query,
    )) as GatewaySetsResult;

    //get logIndex only
    for (let i = 0; i < gatewaySets.length; i++) {
      currentResult[i] = {
        ...gatewaySets[i],
        tx: currentResult[i].id.substring(0, 66),
        logIndex: 1,
      };
    }
    eventResult.push(...currentResult);
    skip += 100;
  } while (currentResult.length == 100);
  eventResult.sort(sortByTime);
  return eventResult;
}
