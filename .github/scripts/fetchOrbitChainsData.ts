import * as fs from 'fs';
import { L2Network, constants as arbConstants } from '@arbitrum/sdk';

type OrbitChainData = {
  chainId: number;
  confirmPeriodBlocks: number;
  ethBridge: {
    bridge: string;
    inbox: string;
    outbox: string;
    rollup: string;
    sequencerInbox: string;
  };
  nativeToken: string;
  explorerUrl: string;
  rpcUrl: string;
  isCustom: boolean;
  isTestnet: boolean;
  name: string;
  slug: string;
  parentChainId: number;
  tokenBridge: {
    parentCustomGateway: string;
    parentErc20Gateway: string;
    parentGatewayRouter: string;
    parentMultiCall: string;
    parentProxyAdmin: string;
    parentWeth: string;
    parentWethGateway: string;
    childCustomGateway: string;
    childErc20Gateway: string;
    childGatewayRouter: string;
    childMultiCall: string;
    childProxyAdmin: string;
    childWeth: string;
    childWethGateway: string;
  };
  bridgeUiConfig: {
    color: string;
    network: {
      name: string;
      logo: string;
      description: string;
    };
    nativeTokenData: {
      name: string;
      symbol: string;
      logoUrl: string;
    };
  };
};

type OrbitChainDataResponse = {
  mainnet: OrbitChainData[];
  testnet: OrbitChainData[];
};

type L2NetworkWithRpc = L2Network & { rpcUrl: string };

const fileName = './src/Assets/orbitChainsData.json';

export async function fetchOrbitChainsData() {
  const response = await fetch(
    'https://raw.githubusercontent.com/OffchainLabs/arbitrum-token-bridge/refs/heads/master/packages/arb-token-bridge-ui/src/util/orbitChainsData.json',
  );

  const data: OrbitChainDataResponse = await response.json();
  return data.mainnet.concat(data.testnet);
}

function parseChainToL2Network({
  chainId,
  nativeToken,
  isTestnet,
  slug,
  bridgeUiConfig,
  parentChainId,
  tokenBridge,
  ...chain
}: OrbitChainData): L2NetworkWithRpc {
  return {
    chainID: chainId,
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    isArbitrum: true,
    partnerChainID: parentChainId,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    depositTimeout: 1800000,
    blockTime: arbConstants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    tokenBridge: {
      l1CustomGateway: tokenBridge.parentCustomGateway,
      l1ERC20Gateway: tokenBridge.parentErc20Gateway,
      l1GatewayRouter: tokenBridge.parentGatewayRouter,
      l1MultiCall: tokenBridge.parentMultiCall,
      l1ProxyAdmin: tokenBridge.parentProxyAdmin,
      l1Weth: tokenBridge.parentWeth,
      l1WethGateway: tokenBridge.parentWethGateway,
      l2CustomGateway: tokenBridge.childCustomGateway,
      l2ERC20Gateway: tokenBridge.childErc20Gateway,
      l2GatewayRouter: tokenBridge.childGatewayRouter,
      l2Multicall: tokenBridge.childMultiCall,
      l2ProxyAdmin: tokenBridge.childProxyAdmin,
      l2Weth: tokenBridge.childWeth,
      l2WethGateway: tokenBridge.childWethGateway,
    },
    ...chain,
  };
}

(async () => {
  const orbitChains = await fetchOrbitChainsData();
  const result: L2NetworkWithRpc[] = orbitChains.map((orbitChain) =>
    parseChainToL2Network(orbitChain),
  );

  fs.writeFileSync(
    fileName,
    JSON.stringify({
      data: result,
    }),
  );
})();
