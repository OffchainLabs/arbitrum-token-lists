import { arbListtoEtherscanList } from '../src/lib/token_list_gen';
import arblist from './schema/arbify.tokenlist.json';

describe('token_list_gen Test', () => {
  describe('arbListtoEtherscanList test', () => {
    it('Should return etherscanlist when use correct arblist', () => {
      expect(() => {
        arbListtoEtherscanList(arblist);
      }).not.toThrow(Error);
    });
  });
});
