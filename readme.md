### Setup

From root:

1. `pnpm install`
2. `cd packages/cli; cp .env.sample .env`
3. In `.env`, either set `MAINNET_RPC`, `GOERLI_RPC`, and `SEPOLIA_RPC` var or `INFURA_KEY`

### Arbify an L1 Token List

`pnpm arbify --tokenList https://gateway.ipfs.io/ipns/tokens.uniswap.org --l2NetworkID 42161 --newArbifiedList ./src/ArbTokenLists/arbed_uniswap_labs.json`

Note that a local list can also be used, i.e.:

`pnpm arbify --tokenList ./src/SourceLists/my_l1_list.json --l2NetworkID 42161`

### Generate Full List

`pnpm fullList`
