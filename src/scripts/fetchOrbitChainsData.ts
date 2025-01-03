import * as fs from 'fs';
import { ArbitrumNetwork } from '@arbitrum/sdk';

type OrbitChainDataResponse = {
  mainnet: ArbitrumNetwork[];
  testnet: ArbitrumNetwork[];
};

const fileName = './src/Assets/orbitChainsData.json';

export async function fetchOrbitChainsData() {
  const response = await fetch(
    'https://raw.githubusercontent.com/OffchainLabs/arbitrum-token-bridge/refs/heads/master/packages/arb-token-bridge-ui/src/util/orbitChainsData.json',
  );

  const data: OrbitChainDataResponse = await response.json();
  return data.mainnet.concat(data.testnet);
}

(async () => {
  const orbitChains = await fetchOrbitChainsData();

  fs.writeFileSync(
    fileName,
    JSON.stringify({
      data: orbitChains,
    }),
  );
})();
