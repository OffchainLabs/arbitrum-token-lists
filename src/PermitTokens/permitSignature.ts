import { Wallet } from "ethers"; 

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

export async function getDaiLikePermitSignature(
    wallet: Wallet,
    token: any,
    spender: string,
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
            nonce: nonce,
            expiry: deadline,
            allowed: true
    };
    
    const sig = await wallet._signTypedData(domain, types, message);
    return [sig, nonce];
}