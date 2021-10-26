import { request, gql } from 'graphql-request';
import { excludeList } from './utils';

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
  const formattedAddresses = l1TokenAddresses
    .map((a: string) => `"${a}"`.toLowerCase())
    .join(',');
  const query = gql`
  {
    tokens(where:{
      id_in:[${formattedAddresses}]
    }) {
      id
      l2Address
      gateway {
        id
      }
    }
  }
`;

  const { tokens } = await request(clientUrl, query);
  return tokens.filter(
    (token: any) => !excludeList.includes(token.id.toLowerCase())
  );
};

export const getAllTokens = async (networkID: string) => {
  const clientUrl = chaidIdToGraphClientUrl(networkID);
  const query = gql`
    {
      tokens(first: 500, skip: 0) {
        id
        l2Address
        gateway {
          id
        }
      }
    }
  `;

  const { tokens } = await request(clientUrl, query);
  return tokens.filter(
    (token: any) => !excludeList.includes(token.id.toLowerCase())
  );
};
