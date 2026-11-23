import '../init';
import { customNetworks, rpcs } from '../customNetworks';
import { generateTokenRegistry } from '../lib/tokenRegistry/generate';

const requiredRpcs = {
  1: 'MAINNET_RPC',
  // Orbit chains that settle on Base read their gas token there.
  8453: 'BASE_RPC',
  11155111: 'SEPOLIA_RPC',
  84532: 'BASE_SEPOLIA_RPC',
} as const;

const rpcUrls: Record<number, string> = { ...rpcs };
for (const [chainId, name] of Object.entries(requiredRpcs)) {
  const url = process.env[name];
  if (!url) {
    throw new Error(`process.env.${name} was not set`);
  }
  rpcUrls[Number(chainId)] = url;
}

// The testnet registry goes in its own folder. One registry failing does not stop the other,
// and each writes its files only when all of them pass their checks.
async function main() {
  let failed = false;
  for (const testnet of [false, true]) {
    try {
      await generateTokenRegistry({
        orbitNetworks: customNetworks,
        rpcUrls,
        outputDir: testnet
          ? './src/TokenRegistry/testnet'
          : './src/TokenRegistry',
        testnet,
      });
    } catch (error) {
      console.error(error);
      failed = true;
    }
  }
  if (failed) {
    process.exit(1);
  }
}

main();
