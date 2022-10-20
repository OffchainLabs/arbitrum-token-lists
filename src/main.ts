import {
  arbifyL1List,
  updateArbifiedList,
  generateFullList,
} from "./lib/token_list_gen";
import { addPermitTags } from "./PermitTokens/permitSignature";
import args from "./lib/getClargs";
import { ArbTokenList, EtherscanList } from "./lib/types";
import { writeToFile } from "./lib/store";

const main = async () => {
  if (args.action === "full") {
    if (args.tokenList !== "full")
      throw new Error("expected --tokenList 'full'");
    if (args.includePermitTags)
      throw new Error("full list mode does not support permit tagging");

    return writeToFile(await generateFullList());
  }

  let tokenList: ArbTokenList;

  if (args.action === "arbify") {
    tokenList = await arbifyL1List(args.tokenList, !!args.includeOldDataFields);
  } else if (args.action === "update") {
    tokenList = await updateArbifiedList(args.tokenList);
  } else {
    throw new Error(`action ${args.action} not recognised`);
  }

  if (args.includePermitTags) tokenList = await addPermitTags(tokenList)

  writeToFile(tokenList);
};

main()
  .then(() => console.log("Done."))
  .catch((err) => {
    console.error(err);
    throw err;
  });
