### Setup
From root:

1. `cp .env.sample .env`
2. In `.env`, set `MAINNET_RPC` var (i.e., set infura key or use different endpoint)
3. `yarn install`

### Arbify an L1 Token Lost

yarn arbify --tokenList https://gateway.ipfs.io/ipns/tokens.uniswap.org

### Generate Full List

`yarn fullList`