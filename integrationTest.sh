#!/bin/bash

# arb1
yarn fullList --l2NetworkID 42161 --skipValidation false
yarn arbify --l2NetworkID 42161 --tokenList https://gateway.ipfs.io/ipns/tokens.uniswap.org --skipValidation false
yarn arbify --l2NetworkID 42161 --tokenList https://www.gemini.com/uniswap/manifest.json --skipValidation false
yarn arbify --l2NetworkID 42161 --tokenList https://api.coinmarketcap.com/data-api/v3/uniswap/all.json --skipValidation false
# update whitelist era list (for e.g. changed gateways)
yarn update --l2NetworkID 42161 --tokenList ./src/ArbTokenLists/arbed_arb_whitelist_era.json --includeOldDataFields true --skipValidation false

# nova
# yarn fullList --l2NetworkID 42170
yarn arbify --l2NetworkID 42170 --tokenList https://gateway.ipfs.io/ipns/tokens.uniswap.org --skipValidation false
yarn arbify --l2NetworkID 42170 --tokenList https://www.gemini.com/uniswap/manifest.json --skipValidation false
yarn arbify --l2NetworkID 42170 --tokenList https://api.coinmarketcap.com/data-api/v3/uniswap/all.json --skipValidation false

# goerli rollup testnet
yarn arbify --l2NetworkID 421613 --tokenList https://api.coinmarketcap.com/data-api/v3/uniswap/all.json --skipValidation false
yarn fullList --l2NetworkID 421613 --skipValidation false

yarn jest