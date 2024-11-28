import { fetchOrbitChainsData } from './fetchOrbitChainsData';
import currentOrbitChains from '../../src/Assets/orbitChainsData.json';

export async function fetchNewOrbitChains() {
  const orbitChains = await fetchOrbitChainsData();
  const oldChainIds = currentOrbitChains.data.map((chain) => chain.chainID);
  const newChainIds: number[] = [];
  // Find all new chains
  orbitChains.forEach((chain) => {
    if (!oldChainIds.includes(chain.chainId)) {
      newChainIds.push(chain.chainId);
    }
  });

  return newChainIds;
}
