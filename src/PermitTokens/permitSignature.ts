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
  const { l1, l2 } = await getNetworkConfig();

  const wallet = Wallet.createRandom().connect(l1.provider);
  const spender = Wallet.createRandom().connect(l1.provider);
  const value = utils.parseUnits("1.0", 18);
  const deadline = constants.MaxUint256;

  const multicall = new Contract(
    "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696",
    multicallAbi,
    wallet
  );
  const permitCalls = [];
  let dictIdx = 0;
  const idxToTokenInfo: { [key: number]: { l1Address: string; token: any } } =
    {};

  const permitTokenInfo: ArbTokenInfo[] = [];

  for (let i = 0; i < tokenList.tokens.length; i++) {
    try {
      const tokenContract = new Contract(
        tokenList.tokens[i].extensions?.bridgeInfo[
          l2.network.partnerChainID
        ].tokenAddress!,
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
        tokenList.tokens[i].extensions?.bridgeInfo[
          l2.network.partnerChainID
        ].tokenAddress!,
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

      permitCalls.push(
        {
          target:
            tokenList.tokens[i].extensions?.bridgeInfo[
              l2.network.partnerChainID
            ].tokenAddress!,
          callData: callData, // normal permit
        },
        {
          target:
            tokenList.tokens[i].extensions?.bridgeInfo[
              l2.network.partnerChainID
            ].tokenAddress!,
          callData: callDataNoVersion, // no version permit
        },
        {
          target:
            tokenList.tokens[i].extensions?.bridgeInfo[
              l2.network.partnerChainID
            ].tokenAddress!,
          callData: callDataDAI, // DAI permit
        }
      );
      idxToTokenInfo[dictIdx] = {
        l1Address:
          tokenList.tokens[i].extensions?.bridgeInfo[l2.network.partnerChainID]
            .tokenAddress!,
        token: tokenList.tokens[i],
      };
      dictIdx += 3;
    } catch (e) {
      // if contract doesn't have permit
      // TODO: check its the expected error message
    }
  }

  // get array of results from tryAggregate
  const tryPermit = await multicall.callStatic.tryAggregate(
    false,
    permitCalls,
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

    // add to existing token lists w tags for all tokens (permit or no permit)
    const tokenInfo = {
      ...tokenList.tokens[i],
    };
    tokenInfo.tags?.push(tag);
    permitTokenInfo.push(tokenInfo);
  }

  return {
    ...tokenList,
    tokens: permitTokenInfo,
  };
};
