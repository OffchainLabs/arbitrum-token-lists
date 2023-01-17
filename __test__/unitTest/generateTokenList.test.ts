// import { removeInvalidTokensFromList, validateTokenListWithErrorThrowing, tokenListIsValid} from '../../src/lib/utils'
// import {  arbListtoEtherscanList } from '../../src/lib/token_list_gen'

// // hey! so my thinking is in this case "unit tests" (vs. integration tests) would be 
// // tests that basically run on isolated pure functions (i.e., thinks that doesn't
// //  rely on external calls). As is, from looking over the codebase, this would currently include:
// // - removeInvalidTokensFromList
// // - arbListtoEtherscanList
// // - validateTokenListWithErrorThrowing
// // - tokenListIsValid
// // a lot of the most useful bits of functionality we'd want
// //  to unit tests are currently burred inside the big generateTokenList 
// //  function, so we'll probably want to break that function up / refactor 
// //  things into smaller methods as we go. But I would say make sure you 
// //  coordinate w/ Christiphe (as he writes integration tests / thinks about 
// //  refactoring) before you too much refactoring yourself, so you two don't clash.

// describe('Token list gen', () => {
    
// })