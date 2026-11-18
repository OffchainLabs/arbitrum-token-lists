import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { buildTokenMappingFiles } from '../../src/lib/tokenMappings';
import { ArbTokenList } from '../../src/lib/types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasTokensArray = (
  value: unknown,
): value is Pick<ArbTokenList, 'tokens'> => {
  if (!isObject(value)) return false;
  return Array.isArray(value.tokens);
};

const sourceDir = resolve(process.argv[2] ?? './src/ArbTokenLists');
const outputDir = resolve(process.argv[3] ?? './src/ArbTokenLists/mappings');

const entries = readdirSync(sourceDir, { withFileTypes: true });
const listFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  .map((entry) => entry.name)
  .sort();

const tokenLists: Array<Pick<ArbTokenList, 'tokens'>> = [];

for (const fileName of listFiles) {
  const filePath = join(sourceDir, fileName);
  const rawContents = readFileSync(filePath, 'utf8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContents);
  } catch (error) {
    console.warn(`Skipping invalid JSON file: ${fileName}`);
    continue;
  }

  if (hasTokensArray(parsed)) {
    tokenLists.push({
      tokens: parsed.tokens,
    });
  }
}

const mappingFiles = buildTokenMappingFiles(tokenLists);
if (mappingFiles.length === 0) {
  throw new Error(
    `No token mappings generated from source directory: ${sourceDir}`,
  );
}

for (const mappingFile of mappingFiles) {
  const outputPath = join(
    outputDir,
    `${mappingFile.fromChainId}`,
    `${mappingFile.toChainId}.json`,
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(mappingFile));
}

console.log(
  `Generated ${mappingFiles.length} mapping file(s) in ${outputDir} from ${listFiles.length} source file(s).`,
);
