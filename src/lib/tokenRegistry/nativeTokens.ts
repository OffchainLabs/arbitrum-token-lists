import { Contract, providers } from 'ethers';

import { CanonicalLink, NATIVE_TOKEN_ADDRESS } from './build';
import { RegistryChain } from './types';

const erc20Abi = [
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
];

// The token lists and LiFi do not list every custom gas token on its parent chain, so its
// metadata comes from the ERC-20 itself.
export async function fetchNativeTokenLinks({
  chains,
  rpcUrls,
}: {
  chains: RegistryChain[];
  rpcUrls: Record<number, string>;
}): Promise<CanonicalLink[]> {
  const links: CanonicalLink[] = [];
  for (const { chainId, name, parentChainId, nativeToken } of chains) {
    if (parentChainId === undefined || nativeToken === undefined) {
      continue;
    }
    const rpcUrl = rpcUrls[parentChainId];
    if (!rpcUrl) {
      throw new Error(
        `No RPC for the parent chain of ${name} (${parentChainId})`,
      );
    }

    const token = new Contract(
      nativeToken,
      erc20Abi,
      new providers.StaticJsonRpcProvider(rpcUrl),
    );
    const [symbol, tokenName, decimals]: [string, string, number] =
      await Promise.all([token.symbol(), token.name(), token.decimals()]);
    links.push({
      childChainId: chainId,
      parentChainId,
      childAddress: NATIVE_TOKEN_ADDRESS,
      parentAddress: nativeToken,
      symbol,
      name: tokenName,
      decimals,
    });
  }
  return links;
}
