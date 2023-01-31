import { getNetworkConfig } from "./lib/instantiate_bridge";
import { generateGatewayMap, promiseErrorMultiplier } from "./lib/utils"
import { constants, utils } from "ethers";
import { getArgvs } from './lib/options';
// const requireEnvVariables = (envVars: string[]) => {
//     for (const envVar of envVars) {
//       if (!process.env[envVar]) {
//         throw new Error(`Error: set your '${envVar}' environmental variable `)
//       }
//     }
//     console.log('Environmental variables properly set 👍')
//   }
// requireEnvVariables(['PORT'])
// export const EtherscanKey = process.env.Etherscan_KEY
// async function main() {
//     console.log(EtherscanKey)
// }
const main = async () => {
    console.log(getArgvs().l2NetworkID)
    const { l1, l2 } = await promiseErrorMultiplier(getNetworkConfig(), (error) =>
    getNetworkConfig()
  );
    let res = await generateGatewayMap(l2.multiCaller, l2.network, l1.provider)
    console.log(res)

// const address = utils.getAddress(utils.hexDataSlice("0x0000000000000000000000000ce51000d5244f1eaac0b313a792d5a5f96931bf",12))
// console.log(address)
}
// import dotenv from 'dotenv'
// import { getNetworkConfig } from "./lib/instantiate_bridge";
// dotenv.config()
// const nodeEnv: string = (process.env["PORT"] as string);
// console.log(nodeEnv);
main()