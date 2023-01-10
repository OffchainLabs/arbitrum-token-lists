export interface L2ToL1GatewayAddresses {
  [contractAddress: string]: string;
}

const objKeyAndValToLowerCase = (obj: { [key: string]: string }) =>
  Object.keys(obj).reduce((acc: { [key: string]: string }, key) => {
    acc[key.toLowerCase()] = obj[key].toLowerCase();
    return acc;
  }, {});

// TODO: read these values from the gateway or a subgraph
export const l2ToL1GatewayAddresses: L2ToL1GatewayAddresses =
  objKeyAndValToLowerCase({
    // L2 ERC20 Gateway	mainnet
    '0x09e9222e96e7b4ae2a407b98d48e330053351eee':
      '0xa3A7B6F88361F48403514059F1F16C8E78d60EeC',
    // L2 Arb-Custom Gateway	mainnet
    '0x096760f208390250649e3e8763348e783aef5562':
      '0xcEe284F754E854890e311e3280b767F80797180d',
    // L2 weth mainnet
    '0x6c411ad3e74de3e7bd422b94a27770f5b86c623b':
      '0xd92023E9d9911199a6711321D1277285e6d4e2db',
    // L2 dai gateway mainnet
    '0x467194771dae2967aef3ecbedd3bf9a310c76c65':
      '0xd3b5b60020504bc3489d6949d545893982ba3011',
    // graph gateway arb1
    '0x65E1a5e8946e7E87d9774f5288f41c30a99fD302':
      '0x01cDC91B0A9bA741903aA3699BF4CE31d6C5cC06',

    // L2 ERC20 Gateway	rinkeby
    '0x195c107f3f75c4c93eba7d9a1312f19305d6375f':
      '0x91169Dbb45e6804743F94609De50D511C437572E',
    // L2 Arb-Custom Gateway	rinkeby
    '0x9b014455acc2fe90c52803849d0002aeec184a06':
      '0x917dc9a69F65dC3082D518192cd3725E1Fa96cA2',
    // L2 Weth Gateway rinkeby
    '0xf94bc045c4e926cc0b34e8d1c41cd7a043304ac9':
      '0x81d1a19cf7071732D4313c75dE8DD5b8CF697eFD',
    // old L2 weth gateway in rinkeby? we can prob remove this
    '0xf90eb31045d5b924900aff29344deb42eae0b087':
      '0x81d1a19cf7071732D4313c75dE8DD5b8CF697eFD',
    // livepeer gateway mainnet
    '0x6d2457a4ad276000a615295f7a80f79e48ccd318':
      '0x6142f1C8bBF02E6A6bd074E8d564c9A5420a0676',
    // Lido gateway Arb1
    '0x07d4692291b9e30e326fd31706f686f83f331b82':
      '0x0f25c1dc2a9922304f2eac71dca9b07e310e8e5a',

    // 421613: arbstandard gateway:
    '0x2ec7bc552ce8e51f098325d2fcf0d3b9d3d2a9a2':
      '0x715D99480b77A8d9D603638e593a539E21345FdF',

    // 421613: custom gateway:
    '0x8b6990830cF135318f75182487A4D7698549C717':
      '0x9fDD1C4E4AA24EEc1d913FABea925594a20d43C7',

    // 421613: WETH gateway:
    '0xf9F2e89c8347BD96742Cc07095dee490e64301d6':
      '0x6e244cD02BBB8a6dbd7F626f05B2ef82151Ab502',

    // 421613 graph gateway:
    '0xef2757855d2802bA53733901F90C91645973f743': '0xc82fF7b51c3e593D709BA3dE1b3a0d233D1DEca1',
  });

// nova
export const l2ToL1GatewayAddressesNova: L2ToL1GatewayAddresses =
  objKeyAndValToLowerCase({
    // L2 ERC20 Gateway	mainnet
    '0xcf9bab7e53dde48a6dc4f286cb14e05298799257':
      '0xb2535b988dce19f9d71dfb22db6da744acac21bf',
    // L2 Arb-Custom Gatewa	mainnet
    '0xbf544970e6bd77b21c6492c281ab60d0770451f4':
      '0x23122da8c581aa7e0d07a36ff1f16f799650232f',
    // L2 weth mainnet
    '0x7626841cb6113412f9c88d3adc720c9fac88d9ed':
      '0xe4e2121b479017955be0b175305b35f312330bae',

    // L2 dai gateway mainnet
    '0x10e6593cdda8c58a1d0f14c5164b376352a55f2f':
      '0x97f63339374fce157aa8ee27830172d2af76a786',
  });

export const excludeList = [
  '0x0CE51000d5244F1EAac0B313a792D5a5f96931BF', //rkr
  '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f', //in
  '0xEDA6eFE5556e134Ef52f2F858aa1e81c84CDA84b', // bad cap
  '0xe54942077Df7b8EEf8D4e6bCe2f7B58B0082b0cd', // swapr
  '0x282db609e787a132391eb64820ba6129fceb2695', // amy
  '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', // mim
  '0x106538cc16f938776c7c180186975bca23875287', // remove once bridged (basv2)
  '0xB4A3B0Faf0Ab53df58001804DdA5Bfc6a3D59008', // spera
  // "0x960b236a07cf122663c4303350609a66a7b288c0", //aragon old
].map(s => s.toLowerCase());

export const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

export const ETHERSCAN_LIST_NAME = 'EtherscanList';

export const ETHERSCAN_PATH = process.env.PWD + '/src/FullList/all_tokens.json';
export const ALL_TOKENS_GOERLI_ROLLUP_PATH =
  process.env.PWD + '/src/FullList/421613_all_tokens.json';
export const TOKENLIST_DIR_PATH = process.env.PWD + '/src/ArbTokenLists';
export const FULLLIST_DIR_PATH = process.env.PWD + '/src/FullList';
