import { BigNumberish, Contract, Wallet, utils, constants } from 'ethers';
import { ArbTokenInfo, ArbTokenList } from '../lib/types';

import permitTokenAbi from '../PermitTokens/permitTokenAbi.json';
import daiPermitTokenAbi from '../PermitTokens/daiPermitTokenAbi.json';
import multicallAbi from '../PermitTokens/multicallAbi.json';
import { getNetworkConfig } from '../lib/instantiate_bridge';
import { getChunks, promiseRetrier } from '../lib/utils';
import { getPrevList } from '../lib/store';
import { getArgvs } from '../lib/options';

async function getPermitSig(
  wallet: Wallet,
  token: Contract,
  spender: string,
  value: BigNumberish,
  deadline: BigNumberish,
  optional?: {
    nonce?: number;
    name?: string;
    chainId?: number;
    version?: string;
  },
) {
  // TODO: check that error is that function instead available (differentiate network fails)
  const [nonce, name, version, chainId] = await Promise.all([
    optional?.nonce ?? token.nonces(wallet.address).catch(() => 0),
    optional?.name ?? token.name().catch(() => ''),
    optional?.version ?? '1',
    optional?.chainId ?? wallet.getChainId(),
  ]);

  const domain = {
    name: name,
    version: version,
    chainId: chainId,
    verifyingContract: token.address,
  };

  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  const message = {
    owner: wallet.address,
    spender: spender,
    value: value,
    nonce: nonce,
    deadline: deadline,
  };

  const sig = await wallet._signTypedData(domain, types, message);
  return sig;
}

async function getPermitSigNoVersion(
  wallet: Wallet,
  token: Contract,
  spender: string,
  value: BigNumberish,
  deadline: BigNumberish,
  optional?: { nonce?: number; name?: string; chainId?: number },
) {
  // TODO: check that error is that function instead available (differentiate network fails)
  const [nonce, name, chainId] = await Promise.all([
    optional?.nonce ?? token.nonces(wallet.address).catch(() => 0),
    optional?.name ?? token.name().catch(() => ''),
    optional?.chainId ?? wallet.getChainId(),
  ]);

  const domain = {
    name: name,
    chainId: chainId,
    verifyingContract: token.address,
  };

  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  const message = {
    owner: wallet.address,
    spender: spender,
    value: value,
    nonce: nonce,
    deadline: deadline,
  };

  const sig = await wallet._signTypedData(domain, types, message);
  return sig;
}

async function getDaiLikePermitSignature(
  wallet: Wallet,
  token: Contract,
  spender: string,
  deadline: BigNumberish,
  optional?: { nonce?: number; name?: string; chainId?: number },
): Promise<[string, number]> {
  // TODO: check that error is that function instead available (differentiate network fails)
  const [nonce, name, chainId] = await Promise.all([
    optional?.nonce ?? token.nonces(wallet.address).catch(() => 0),
    optional?.name ?? token.name().catch(() => ''),
    optional?.chainId ?? wallet.getChainId(),
  ]);

  const domain = {
    name: name,
    version: '1',
    chainId: chainId,
    verifyingContract: token.address,
  };

  const types = {
    Permit: [
      { name: 'holder', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'allowed', type: 'bool' },
    ],
  };

  const message = {
    holder: wallet.address,
    spender: spender,
    nonce: nonce,
    expiry: deadline,
    allowed: true,
  };

  const sig = await wallet._signTypedData(domain, types, message);
  return [sig, nonce];
}

enum PermitTypes {
  Standard = 'Standard Permit',
  NoVersionInDomain = 'No Version in Domain',
  DaiLike = 'Dai-Like Sig/Permit',
  NoPermit = 'No Permit Enabled',
}

export const addPermitTags = async (
  tokenList: ArbTokenList,
): Promise<ArbTokenList> => {
  console.log('Adding permit tags');
  const { l1, l2 } = await getNetworkConfig();
  const argvs = getArgvs();

  // Load cache from previous token list (same list we're updating)
  const prevList = argvs.ignorePreviousList
    ? null
    : await getPrevList(argvs.prevArbifiedList);

  const permitCache: { [key: string]: string } = {};
  if (prevList && prevList.tokens) {
    for (const token of prevList.tokens) {
      if (token.tags && Array.isArray(token.tags)) {
        const permitTag = token.tags.find(
          (tag: string) => tag.includes('Permit') || tag.includes('permit'),
        );
        if (permitTag) {
          const cacheKey = `${token.chainId}:${token.address.toLowerCase()}`;
          permitCache[cacheKey] = permitTag;
        }
      }
    }
    console.log(
      `Loaded ${
        Object.keys(permitCache).length
      } permit tags from previous list`,
    );
  }

  const value = utils.parseUnits('1.0', 18);
  const deadline = constants.MaxUint256;

  type Call = {
    tokenIndex: number;
    target: string;
    callData: string;
  };
  const l1Calls: Array<Call> = [];
  const l2Calls: Array<Call> = [];

  const permitTokenInfo: ArbTokenInfo[] = [...tokenList.tokens];

  // Apply cached results first
  let cachedCount = 0;
  for (let i = 0; i < permitTokenInfo.length; i++) {
    const curr = permitTokenInfo[i];
    const cacheKey = `${curr.chainId}:${curr.address.toLowerCase()}`;
    const cachedResult = permitCache[cacheKey] as PermitTypes | undefined;

    if (cachedResult) {
      const tags = curr.tags ?? [];
      tags.push(cachedResult);
      permitTokenInfo[i] = {
        ...permitTokenInfo[i],
        tags,
      };
      cachedCount++;
    }
  }
  console.log(
    `Applied ${cachedCount} cached permit results from existing token lists`,
  );

  // Only process tokens not in cache
  for (let i = 0; i < permitTokenInfo.length; i++) {
    const curr = permitTokenInfo[i];
    const cacheKey = `${curr.chainId}:${curr.address.toLowerCase()}`;

    // Skip if already cached
    if (permitCache[cacheKey]) {
      continue;
    }

    const isL1Token = curr.chainId === l2.network.parentChainId;
    const isL2Token = curr.chainId === l2.network.chainId;
    if (!isL1Token && !isL2Token) continue;

    const provider = isL1Token ? l1.provider : l2.provider;
    const wallet = Wallet.createRandom().connect(provider);
    const spender = Wallet.createRandom().connect(provider);

    const tokenContract = new Contract(
      curr.address,
      permitTokenAbi['abi'],
      wallet,
    );

    const signature = await getPermitSig(
      wallet,
      tokenContract,
      spender.address,
      value,
      deadline,
    );
    const { v, r, s } = utils.splitSignature(signature);
    const iface = new utils.Interface(permitTokenAbi['abi']);
    const callData = iface.encodeFunctionData('permit', [
      wallet.address,
      spender.address,
      value,
      deadline,
      v,
      r,
      s,
    ]);

    // Permit no version
    const signatureNoVersion = await getPermitSigNoVersion(
      wallet,
      tokenContract,
      spender.address,
      value,
      deadline,
    );
    const { v: vNo, r: rNo, s: sNo } = utils.splitSignature(signatureNoVersion);
    const callDataNoVersion = iface.encodeFunctionData('permit', [
      wallet.address,
      spender.address,
      value,
      deadline,
      vNo,
      rNo,
      sNo,
    ]);

    // DAI permit
    const daiTokenContract = new Contract(
      curr.address,
      daiPermitTokenAbi,
      wallet,
    );
    const signatureDAI = await getDaiLikePermitSignature(
      wallet,
      daiTokenContract,
      spender.address,
      deadline,
    );
    const { v: vDAI, r: rDAI, s: sDAI } = utils.splitSignature(signatureDAI[0]);
    const ifaceDAI = new utils.Interface(daiPermitTokenAbi);
    const callDataDAI = ifaceDAI.encodeFunctionData('permit', [
      wallet.address,
      spender.address,
      signatureDAI[1],
      deadline,
      true,
      vDAI,
      rDAI,
      sDAI,
    ]);

    (isL1Token ? l1Calls : l2Calls).push(
      {
        tokenIndex: i,
        target: curr.address,
        callData: callData, // normal permit
      },
      {
        tokenIndex: i,
        target: curr.address,
        callData: callDataNoVersion, // no version permit
      },
      {
        tokenIndex: i,
        target: curr.address,
        callData: callDataDAI, // DAI permit
      },
    );
  }

  const handleCalls = async (calls: Array<Call>, layer: 1 | 2) => {
    if (calls.length === 0) {
      console.log(`No uncached tokens to check on L${layer}`);
      return;
    }

    const tokenBridge = l2.network.tokenBridge;

    if (!tokenBridge) {
      throw new Error('Child network is missing tokenBridge');
    }

    let multiCallAddr =
      tokenBridge[layer === 2 ? 'childMultiCall' : 'parentMultiCall'];
    const isL1Mainnet = layer === 1 && l2.network.parentChainId === 1;
    if (isL1Mainnet)
      multiCallAddr = '0x1b193bedb0b0a29c5759355d4193cb2838d2e170';

    const provider = (layer === 1 ? l1 : l2).provider;
    const multicall = new Contract(multiCallAddr, multicallAbi, provider);
    const tryPermit = [];
    for (const chunk of getChunks(calls, 100)) {
      console.log(`Processing chunk of ${chunk.length} calls on L${layer}`);
      const curr = promiseRetrier(() =>
        multicall.callStatic[
          isL1Mainnet ? 'tryAggregateGasRation' : 'tryAggregate'
        ](
          false,
          chunk.map((curr) => ({
            target: curr.target,
            callData: curr.callData,
          })),
        ),
      );
      tryPermit.push(...(await curr));
    }
    tryPermit.flat(1);

    for (let i = 0; i < tryPermit.length; i += 3) {
      let tag;
      if (tryPermit[i].success === true) {
        tag = PermitTypes.Standard;
      } else if (tryPermit[i + 1].success === true) {
        tag = PermitTypes.NoVersionInDomain;
      } else if (tryPermit[i + 2].success === true) {
        tag = PermitTypes.DaiLike;
      } else {
        tag = PermitTypes.NoPermit;
      }
      const originalIndex = calls[i].tokenIndex;
      const info = permitTokenInfo[originalIndex];

      // Add to cache
      const cacheKey = `${info.chainId}:${info.address.toLowerCase()}`;
      permitCache[cacheKey] = tag;

      // add to existing token lists w tags for all tokens (permit or no permit)
      const tags = info.tags ?? [];
      tags.push(tag);

      permitTokenInfo[originalIndex] = {
        ...permitTokenInfo[originalIndex],
        tags,
      };
    }
  };

  await handleCalls(l1Calls, 1);
  await handleCalls(l2Calls, 2);

  return {
    ...tokenList,
    tokens: permitTokenInfo,
  };
};
