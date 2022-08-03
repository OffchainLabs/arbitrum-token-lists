import { CallInput } from "@arbitrum/sdk";
import { ERC20 } from "@arbitrum/sdk/dist/lib/abi/ERC20";
import { ERC20PermitUpgradeable } from "@arbitrum/sdk/dist/lib/abi/ERC20PermitUpgradeable";
import daiPermitTokenAbi from "../PermitTokens/daiPermitTokenAbi.json";
import { BigNumber, Wallet } from "ethers"; 
import { NumericLiteral } from "typescript";
import { getNetworkConfig } from "../lib/instantiate_bridge";
import { SignatureLike } from "@ethersproject/bytes";

export async function getCorrectPermitSig(
    wallet: Wallet,
    token: any,
    spender: string,
    value: any,
    deadline: any,
    optional?: { nonce?: number; name?: string; chainId?: number; version?: string }
    ) { 
    const [nonce, name, version, chainId] = await Promise.all([
        optional?.nonce ?? token.nonces(wallet.address),
        optional?.name ?? token.name(),
        optional?.version ?? '1',
        optional?.chainId ?? wallet.getChainId(),
    ])
    
    const domain = {
        "name": name,
        "version": version,
        "chainId": chainId,
        "verifyingContract": token.address
    };
    
    const types = {
        Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256'},
        { name: 'deadline', type: 'uint256' },
    ],
    }
    
    const message = {
            owner: wallet.address,
            spender: spender,
            value: value,
            nonce: nonce,
            deadline: deadline
    };
    
    const sig = await wallet._signTypedData(domain, types, message);
    return sig;
}

export async function getCorrectPermitSigNoVersion(
    wallet: Wallet,
    token: any,
    spender: string,
    value: any,
    deadline: any,
    optional?: { nonce?: number; name?: string; chainId?: number;}
    ) { 
    const [nonce, name, chainId] = await Promise.all([
        optional?.nonce ?? token.nonces(wallet.address),
        optional?.name ?? token.name(),
        optional?.chainId ?? wallet.getChainId(),
    ])
    
    const domain = {
        "name": name,
        "chainId": chainId,
        "verifyingContract": token.address
    };
    
    const types = {
        Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256'},
        { name: 'deadline', type: 'uint256' },
    ],
    }
    
    const message = {
            owner: wallet.address,
            spender: spender,
            value: value,
            nonce: nonce,
            deadline: deadline
    };
    
    const sig = await wallet._signTypedData(domain, types, message);
    return sig;
}

// export async function getDaiLikePermitSignature(
//     wallet: Wallet,
//     token: any,
//     spender: string,
//     deadline: any,
//     optional?: { nonce?: number; name?: string; chainId?: number;}
//     ) { 
//     const [nonce, name, chainId] = await Promise.all([
//         optional?.nonce ?? token.nonces(wallet.address),
//         optional?.name ?? token.name(),
//         optional?.chainId ?? wallet.getChainId(),
//     ])

//     const { l1 } = await getNetworkConfig();

//     const name1 = token.name()
//     const nonce1 = token.nonces(wallet.address)
//     const chainId1 = wallet.getChainId();

//     const [name11, nonce11, chainId11] = await l1.multiCaller.getTokenData([name1, nonce1, chainId1]);
//     console.log(name11, nonce11, chainId11);
//     // const tokenData = await l1.multiCaller.getTokenData(
//     //     token.address,
//     //     { name: true, nonces: true }
//     // )
    
//     const domain = {
//         "name": name,
//         "version": "1", 
//         "chainId": chainId,
//         "verifyingContract": token.address
//     };
    
//     const types = {
//         Permit: [
//         { name: 'holder', type: 'address' },
//         { name: 'spender', type: 'address' },
//         { name: 'nonce', type: 'uint256' },
//         { name: 'expiry', type: 'uint256'},
//         { name: 'allowed', type: 'bool' },
//     ],
//     }
    
//     const message = {
//             holder: wallet.address,
//             spender: spender,
//             nonce: nonce,
//             expiry: deadline,
//             allowed: true
//     };
    
//     const sig = await wallet._signTypedData(domain, types, message);
//     return [sig, nonce];
// }

export async function getDaiLikePermitSignature(
    wallet: Wallet,
    token: any,
    spender: string,
    deadline: any,
    optional?: { nonce?: number; name?: string; chainId?: number;}
    ): Promise<[SignatureLike, BigNumber]> { 

    const chainId = await wallet.getChainId();
    const { l1 } = await getNetworkConfig();

    const inputs: [
        CallInput<Awaited<ReturnType<ERC20['functions']['name']>>[0]>,
        CallInput<Awaited<ReturnType<ERC20PermitUpgradeable['functions']['nonces']>>[0]>,
       ] = [
          {
            targetAddr: token.address,
            encoder: () => token.interface.encodeFunctionData('name'),
            decoder: (returnData: string) =>
            token.interface.decodeFunctionResult('name', returnData)[0],
         },
         {
            targetAddr: token.address,
            encoder: () => token.interface.encodeFunctionData('nonces', [wallet.address]),
            decoder: (returnData: string) =>
            token.interface.decodeFunctionResult('nonces', returnData)[0],
       },
    ]
      
    const res = await l1.multiCaller.multiCall(inputs)

    const domain = {
        "name": res[0],
        "version": "1", 
        "chainId": chainId,
        "verifyingContract": token.address
    };
    
    const types = {
        Permit: [
        { name: 'holder', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256'},
        { name: 'allowed', type: 'bool' },
    ],
    }
    
    const message = {
            holder: wallet.address,
            spender: spender,
            nonce: res[1],
            expiry: deadline,
            allowed: true
    };
    
    const sig = await wallet._signTypedData(domain, types, message);
    return [sig, res[1]!];
}