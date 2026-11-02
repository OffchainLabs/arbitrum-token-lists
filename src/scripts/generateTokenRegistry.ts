import '../init';
import { customNetworks, rpcs } from '../customNetworks';
import { generateTokenRegistry } from '../lib/tokenRegistry/generate';

if (!process.env.MAINNET_RPC) {
  throw new Error('process.env.MAINNET_RPC was not set');
}

generateTokenRegistry({
  orbitNetworks: customNetworks,
  rpcUrls: { ...rpcs, 1: process.env.MAINNET_RPC },
  outputDir: './src/TokenRegistry/v1',
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
