import { Contract, providers, utils } from 'ethers';

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
const BATCH_SIZE = 500;

const multicallAbi = [
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) view returns ((bool success, bytes returnData)[] returnData)',
];
const oftVersionCallData = new utils.Interface([
  'function oftVersion() view returns (bytes4 interfaceId, uint64 version)',
]).encodeFunctionData('oftVersion');

// oftVersion() returns a bytes4 and a uint64, two 32-byte words.
const OFT_VERSION_RETURN_BYTES = 64;

type Multicall = Contract;

// A token that burns all the gas fails the whole batch, so a failed batch is split in two until
// the failing token is alone. That token counts as not an OFT.
async function findOftTokensInBatch(
  multicall: Multicall,
  addresses: string[],
): Promise<string[]> {
  let results: { success: boolean; returnData: string }[];
  try {
    results = await multicall.callStatic.aggregate3(
      addresses.map((target) => ({
        target,
        allowFailure: true,
        callData: oftVersionCallData,
      })),
    );
  } catch (error) {
    if (addresses.length === 1) {
      return [];
    }
    const middle = Math.ceil(addresses.length / 2);
    return [
      ...(await findOftTokensInBatch(multicall, addresses.slice(0, middle))),
      ...(await findOftTokensInBatch(multicall, addresses.slice(middle))),
    ];
  }

  return addresses.filter((_address, index) => {
    const result = results[index];
    return (
      result?.success &&
      utils.hexDataLength(result.returnData) >= OFT_VERSION_RETURN_BYTES
    );
  });
}

// A token that answers oftVersion() is an OFT. A failed call counts as not an OFT.
export async function findOftTokens({
  rpcUrl,
  addresses,
}: {
  rpcUrl: string;
  addresses: string[];
}): Promise<Set<string>> {
  const multicall = new Contract(
    MULTICALL3_ADDRESS,
    multicallAbi,
    new providers.StaticJsonRpcProvider(rpcUrl),
  );
  const oftAddresses = new Set<string>();

  for (let start = 0; start < addresses.length; start += BATCH_SIZE) {
    const batch = addresses.slice(start, start + BATCH_SIZE);
    for (const address of await findOftTokensInBatch(multicall, batch)) {
      oftAddresses.add(address);
    }
  }

  return oftAddresses;
}
