import { BigNumberish, Contract, Wallet, utils, constants } from 'ethers';
import { ArbTokenInfo, ArbTokenList } from '../lib/types';

import permitTokenAbi from '../PermitTokens/permitTokenAbi.json';
import daiPermitTokenAbi from '../PermitTokens/daiPermitTokenAbi.json';
import multicallAbi from '../PermitTokens/multicallAbi.json';
import { getNetworkConfig } from '../lib/instantiate_bridge';


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
  }
) {
  const [nonce, name, version, chainId] = await Promise.all([
    optional?.nonce ?? token.nonces(wallet.address),
    optional?.name ?? token.name(),
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
  optional?: { nonce?: number; name?: string; chainId?: number }
) {
  const [nonce, name, chainId] = await Promise.all([
    optional?.nonce ?? token.nonces(wallet.address),
    optional?.name ?? token.name(),
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
  optional?: { nonce?: number; name?: string; chainId?: number }
): Promise<[string, number]> {
  const [nonce, name, chainId] = await Promise.all([
    optional?.nonce ?? token.nonces(wallet.address),
    optional?.name ?? token.name(),
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
  tokenList: ArbTokenList
): Promise<ArbTokenList> => {
  console.log("Adding permit tags")
  const { l1, l2 } = await getNetworkConfig();

  const value = utils.parseUnits("1.0", 18);
  const deadline = constants.MaxUint256;

  type Call = {
    tokenIndex: number,
    target: string,
    callData: string,
  }
  const l1Calls: Array<Call> = [];
  const l2Calls: Array<Call> = [];

  const permitTokenInfo: ArbTokenInfo[] = [
    ...tokenList.tokens
  ];

  for (let i=0; i<permitTokenInfo.length; i++) {
    const curr = permitTokenInfo[i]
    const isL1Token = curr.chainId !== l2.network.partnerChainID
    const isL2Token = curr.chainId !== l2.network.chainID
    if(!isL1Token && !isL2Token) continue;

    const provider = isL1Token ? l1.provider : l2.provider
    const wallet = Wallet.createRandom().connect(provider);
    const spender = Wallet.createRandom().connect(provider);

    try {
      const tokenContract = new Contract(
        curr.address,
        permitTokenAbi["abi"],
        wallet
      );
      const signature = await getPermitSig(
        wallet,
        tokenContract,
        spender.address,
        value,
        deadline
      );
      const { v, r, s } = utils.splitSignature(signature);
      const iface = new utils.Interface(permitTokenAbi["abi"]);
      const callData = iface.encodeFunctionData("permit", [
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
        deadline
      );
      const {
        v: vNo,
        r: rNo,
        s: sNo,
      } = utils.splitSignature(signatureNoVersion);
      const callDataNoVersion = iface.encodeFunctionData("permit", [
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
        wallet
      );
      const signatureDAI = await getDaiLikePermitSignature(
        wallet,
        daiTokenContract,
        spender.address,
        deadline
      );
      const {
        v: vDAI,
        r: rDAI,
        s: sDAI,
      } = utils.splitSignature(signatureDAI[0]);
      const ifaceDAI = new utils.Interface(daiPermitTokenAbi);
      const callDataDAI = ifaceDAI.encodeFunctionData("permit", [
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
        }
      );
    } catch (e) {
      // if contract doesn't have permit
      // TODO: check its the expected error message
    }
  }

  const handleCalls = async (calls: Array<Call>, layer: 1 | 2) => {
    // TODO: use SDKs multicaller
    const multiCallAddr = l2.network.tokenBridge[layer === 2 ? "l2Multicall" : "l1MultiCall"]
    const provider = (layer === 1 ? l1 : l2).provider
    const multicall = new Contract(multiCallAddr, multicallAbi, provider)
    // get array of results from tryAggregate
    const tryPermit = await multicall.callStatic.tryAggregate(
      false,
      calls.map(curr => ({target: curr.target, callData: curr.callData})),
      { gasLimit: 2000000 }
    );

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
      const originalIndex = l1Calls[i].tokenIndex
      // add to existing token lists w tags for all tokens (permit or no permit)
      if (!permitTokenInfo[originalIndex].tags)
        (permitTokenInfo[originalIndex].tags as any) = [];
      permitTokenInfo[originalIndex].tags!.push(tag)
    }
  }

  await handleCalls(l1Calls, 1)
  await handleCalls(l2Calls, 2)

  return {
    ...tokenList,
    tokens: permitTokenInfo,
  };
};
