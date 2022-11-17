import { getNetworkConfig } from './lib/instantiate_bridge';
import { generateGatewayMap, promiseErrorMultiplier } from './lib/utils';
const main = async () => {
  const { l1, l2 } = await promiseErrorMultiplier(getNetworkConfig(), (error) =>
    getNetworkConfig()
  );
  const res = await generateGatewayMap(l2.multiCaller, l2.network, l1.provider);
  console.log(res);
};
main();
