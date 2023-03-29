### Setup

From root:

1. `yarn install`
2. `cd packages/cli; cp .env.sample .env`
3. In `.env`, either set `MAINNET_RPC` and `GOERLI_RPC` var or `INFURA_KEY`

### Arbify an L1 Token List

`yarn arbify --tokenList https://tokens.uniswap.org --l2NetworkID 42161 --newArbifiedList ./src/ArbTokenLists/arbed_uniswap_labs.json`

Note that a local list can also be used, i.e.:

`yarn arbify --tokenList ./src/SourceLists/my_l1_list.json --l2NetworkID 42161`

### Generate Full List

`yarn fullList`
