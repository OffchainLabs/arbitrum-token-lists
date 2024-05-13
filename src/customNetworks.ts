import {
  L2Network,
  addCustomNetwork,
  constants as arbConstants,
} from '@arbitrum/sdk';

const xai: L2Network = {
  chainID: 660279,
  confirmPeriodBlocks: 45818,
  ethBridge: {
    bridge: '0x7dd8A76bdAeBE3BBBaCD7Aa87f1D4FDa1E60f94f',
    inbox: '0xaE21fDA3de92dE2FDAF606233b2863782Ba046F9',
    outbox: '0x1E400568AD4840dbE50FB32f306B842e9ddeF726',
    rollup: '0xC47DacFbAa80Bd9D8112F4e8069482c2A3221336',
    sequencerInbox: '0x995a9d3ca121D48d21087eDE20bc8acb2398c8B1',
  },
  explorerUrl: 'https://explorer.xai-chain.net',
  isArbitrum: true,
  isCustom: true,
  name: 'Xai',
  partnerChainID: 42161,
  partnerChainIDs: [],
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    l1CustomGateway: '0xb15A0826d65bE4c2fDd961b72636168ee70Af030',
    l1ERC20Gateway: '0xb591cE747CF19cF30e11d656EB94134F523A9e77',
    l1GatewayRouter: '0x22CCA5Dc96a4Ac1EC32c9c7C5ad4D66254a24C35',
    l1MultiCall: '0x842eC2c7D803033Edf55E478F461FC547Bc54EB2',
    l1ProxyAdmin: '0x041f85dd87c46b941dc9b15c6628b19ee5358485',
    l1Weth: '0x0000000000000000000000000000000000000000',
    l1WethGateway: '0x0000000000000000000000000000000000000000',
    l2CustomGateway: '0x96551194230725c72ACF8E9573B1382CCBC70635',
    l2ERC20Gateway: '0x0c71417917D24F4A6A6A55559B98c5cCEcb33F7a',
    l2GatewayRouter: '0xd096e8dE90D34de758B0E0bA4a796eA2e1e272cF',
    l2Multicall: '0xEEC168551A85911Ec3A905e0561b656979f3ea67',
    l2ProxyAdmin: '0x56800fDCFbE19Ea3EE9d115dAC30d95d6459c44E',
    l2Weth: '0x0000000000000000000000000000000000000000',
    l2WethGateway: '0x0000000000000000000000000000000000000000',
  },
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 1800000,
  blockTime: arbConstants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
};

const rari: L2Network = {
  chainID: 1380012617,
  confirmPeriodBlocks: 45818,
  ethBridge: {
    bridge: '0x255f80Ef2F09FCE0944faBb292b8510F01316Cf0',
    inbox: '0x37e60F80d921dc5E7f501a7130F31f6548dBa564',
    outbox: '0x91591BB66075BCfF94AA128B003134165C3Ab83a',
    rollup: '0x2e988Ea0873C9d712628F0bf38DAFdE754927C89',
    sequencerInbox: '0xA436f1867adD490BF1530c636f2FB090758bB6B3',
  },
  explorerUrl: 'https://mainnet.explorer.rarichain.org',
  isArbitrum: true,
  isCustom: true,
  name: 'RARI Mainnet',
  partnerChainID: 42161,
  partnerChainIDs: [],
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    l1CustomGateway: '0x8bE956aB42274056ef4471BEb211b33e258b7324',
    l1ERC20Gateway: '0x46406c88285AD9BE2fB23D9aD96Cb578d824cAb6',
    l1GatewayRouter: '0x2623C144B4d167f70893f6A8968B98c89a6C5F97',
    l1MultiCall: '0x842eC2c7D803033Edf55E478F461FC547Bc54EB2',
    l1ProxyAdmin: '0x003e70b041abb993006c03e56c8515622a02928c',
    l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    l1WethGateway: '0x8DF47DAe3313663C80f5E94A893190710A719224',
    l2CustomGateway: '0x90E43f5d772e50B01B3F9596f65AD5653467d010',
    l2ERC20Gateway: '0x0CA4c24079a191e08F659699292e5C75274EF253',
    l2GatewayRouter: '0x9a2859B2a83148b8DE25d26643B5407555D219E1',
    l2Multicall: '0x4c753F58Ee9E83B38170abAbBEa8B47976C7ee1b',
    l2ProxyAdmin: '0x18AB1fE7CBeB5F40d2eAf8A3906A966d59E79767',
    l2Weth: '0xf037540e51D71b2D2B1120e8432bA49F29EDFBD0',
    l2WethGateway: '0xd0C21F7960ea9835E7B2E636548f4deDD9E2309C',
  },
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 1800000,
  blockTime: arbConstants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
};

const muster: L2Network = {
  chainID: 4078,
  confirmPeriodBlocks: 7200,
  ethBridge: {
    bridge: '0xB0EC3C1368AF7d9C2CAE6B7f8E022Cc14d59D2b1',
    inbox: '0x18BB8310E3a3DF4EFcCb6B3E9AeCB8bE6d4af07f',
    outbox: '0xD17550876106645988051ffDd31dFc3cDaA29F9c',
    rollup: '0x73CA76d9B04661604fF950fB8DBc9f18F1B853f1',
    sequencerInbox: '0xfb27e42E964F3364630F76D62EB295ae792BD4FA',
  },
  explorerUrl: 'https://muster-explorer.alt.technology',
  isArbitrum: true,
  isCustom: true,
  name: 'Muster',
  partnerChainID: 42161,
  partnerChainIDs: [],
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    l1CustomGateway: '0x6085B32d97be137cC2D6447DcB3BF684C0835D2F',
    l1ERC20Gateway: '0x6551eF99126253B7a838Cf46340030C8eD5342c2',
    l1GatewayRouter: '0x5040981c42fD61219cc567e255129166A840938e',
    l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822',
    l1ProxyAdmin: '0x37119EAcFBc1c83DDAf80F6705b6B19630C101C4',
    l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    l1WethGateway: '0x5e833dd255e2aafFcfB32E874F5e2dFA17A109Ee',
    l2CustomGateway: '0x9FcC7aC2c40eFD0443D8B641e482F04310F113f6',
    l2ERC20Gateway: '0xFdEb5b89bb8FCA61BF77f205B9F89aC3C5fA5dB8',
    l2GatewayRouter: '0xDcF4964Dbb526e91CD6354ac3d1247Ce93C21fc4',
    l2Multicall: '0xaA6669a609862871ce72c91a93E70F1ef7590271',
    l2ProxyAdmin: '0xf10D50B24eDd74ECF3B6Bc22aE74b7F9843e0fDD',
    l2Weth: '0x869Bf8814d77106323745758135b999D34C79a87',
    l2WethGateway: '0xB6145BFd3fA9D270871037238003c66B984787f4',
  },
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 1800000,
  blockTime: arbConstants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
};
const proofOfPlayApex: L2Network = {
  chainID: 70700,
  confirmPeriodBlocks: 40320,
  ethBridge: {
    bridge: '0x074fFD20C6D8865752C997f4980Cf70F2a3Fbac6',
    inbox: '0xC3874bE54E3f25BBC6B4fB582654fd9294f485a1',
    outbox: '0x0cD85675897B7020d7121e63AB250d3F47ff3Ff2',
    rollup: '0x65AD139061B3f6DDb16170a07b925337ddf42407',
    sequencerInbox: '0xa58F38102579dAE7C584850780dDA55744f67DF1',
  },
  explorerUrl: 'https://explorer.apex.proofofplay.com',
  isArbitrum: true,
  isCustom: true,
  name: 'Proof of Play Apex',
  partnerChainID: 42161,
  partnerChainIDs: [],
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    l1CustomGateway: '0x653f8D34a86207569069164d45a031eE552A4729',
    l1ERC20Gateway: '0x298eb8d9f2F046AC60c01535fad40320CCdeB7c0',
    l1GatewayRouter: '0x2f883c5997Cf60B4d52a2fD4039918E1f9D1147c',
    l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822',
    l1ProxyAdmin: '0xCC6f49cff395c4d160C61112522700dcB007c41d',
    l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    l1WethGateway: '0xEB2Ae03709f63CEa9E5eC6ab25C1838c4A5634BA',
    l2CustomGateway: '0x1a4ba648Ddc0E726085A847178eBff204411EB1A',
    l2ERC20Gateway: '0x7aEdD5a2F3bBd4841711D017Edf90d611aD96a9e',
    l2GatewayRouter: '0x33e59640CD7E5C5E8D43fd46d995efDdDd0Fc930',
    l2Multicall: '0xEB4150a4F26Cf3563B3a86965E269C8873D48527',
    l2ProxyAdmin: '0x518e5FA773118b779a6231303f5593A10D3B3c84',
    l2Weth: '0x77684A04145a5924eFCE0D92A7c4a2A2E8C359de',
    l2WethGateway: '0x6e965dd667cb08f09DE8285317f012Ac889507b4',
  },
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 1800000,
  blockTime: arbConstants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
};
const l3x: L2Network = {
  chainID: 12324,
  confirmPeriodBlocks: 7200,
  ethBridge: {
    bridge: '0x59E088d827CB7983Cd0CC64312E472D7cc8a4F44',
    inbox: '0x80de5c4ccDfb7b6a250A9588C2d80F62a2B7d13F',
    outbox: '0x1526DAacDAf3EE81E5ae087E0DA8677E8c677CE5',
    rollup: '0xb75A0a5812303cBB198d4f0BcA7CA38f17b8783e',
    sequencerInbox: '0xB9450b512Fd3454e9C1a2593C5DF9E71344b5653',
  },
  explorerUrl: 'https://explorer.l3x.com',
  isArbitrum: true,
  isCustom: true,
  name: 'L3X Network',
  partnerChainID: 42161,
  partnerChainIDs: [],
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    l1CustomGateway: '0xec80A45ebadD945379f69e9A8929973BCb3E297D',
    l1ERC20Gateway: '0x4fF3E70f30f0394Ad62428751Fe3858740595908',
    l1GatewayRouter: '0x817C8Da480bC6b42a5FA88A26e9eD8c0c03968Cf',
    l1MultiCall: '0x90B02D9F861017844F30dFbdF725b6aa84E63822',
    l1ProxyAdmin: '0x0000000000000000000000000000000000000000',
    l1Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    l1WethGateway: '0x9bd7C6d040665E95a4FE70b61718abca2E3A62CD',
    l2CustomGateway: '0x1AE90d0FBf03d1bb0685D4bAc5BCe4F4071cB0dc',
    l2ERC20Gateway: '0x76df9F5004F38aC74D0cE664027a1E718AA45E97',
    l2GatewayRouter: '0x460E0a28a1DcE5a15811C3F5775D1e8fd0a08278',
    l2Multicall: '0xA9cfB51510b18300cf056d7e0b96925a1D11f424',
    l2ProxyAdmin: '0xFB027dBD2FBb343FD16D66a63a690B29D51D23AA',
    l2Weth: '0xD3f8b9D33b159E8f5141d28880b216d31B00ee63',
    l2WethGateway: '0x0fEf8843450b7c6a416C30D1E00cbc535Bb905b6',
  },
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 1800000,
  blockTime: arbConstants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
};

addCustomNetwork({ customL2Network: xai });
addCustomNetwork({ customL2Network: rari });
addCustomNetwork({ customL2Network: muster });
addCustomNetwork({ customL2Network: proofOfPlayApex });
addCustomNetwork({ customL2Network: l3x });
