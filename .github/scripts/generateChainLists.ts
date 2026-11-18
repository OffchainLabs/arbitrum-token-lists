import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

type Token = {
  chainId: number;
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  logoURI?: string;
  extensions?: unknown;
  [key: string]: unknown;
};

type TokenList = {
  name: string;
  timestamp: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  tokens: Token[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isToken = (value: unknown): value is Token => {
  if (!isObject(value)) return false;

  return (
    typeof value.chainId === 'number' &&
    Number.isInteger(value.chainId) &&
    typeof value.address === 'string'
  );
};

const isTokenList = (value: unknown): value is { tokens: unknown[] } => {
  if (!isObject(value)) return false;
  return Array.isArray(value.tokens);
};

const tokenQualityScore = (token: Token): number => {
  let score = 0;

  if (typeof token.name === 'string' && token.name.length > 0) score += 1;
  if (typeof token.symbol === 'string' && token.symbol.length > 0) score += 1;
  if (typeof token.logoURI === 'string' && token.logoURI.length > 0) score += 1;
  if (isObject(token.extensions)) score += 2;

  return score;
};

const pickPreferredToken = (current: Token, incoming: Token): Token => {
  const currentScore = tokenQualityScore(current);
  const incomingScore = tokenQualityScore(incoming);
  if (incomingScore > currentScore) return incoming;
  return current;
};

const compareTokens = (a: Token, b: Token): number => {
  const symbolCompare = (a.symbol ?? '').localeCompare(b.symbol ?? '');
  if (symbolCompare !== 0) return symbolCompare;

  const nameCompare = (a.name ?? '').localeCompare(b.name ?? '');
  if (nameCompare !== 0) return nameCompare;

  return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
};

const sourceDir = resolve(process.argv[2] ?? './src/ArbTokenLists');
const outputDir = resolve(process.argv[3] ?? './src/ArbTokenLists/chains');

const entries = readdirSync(sourceDir, { withFileTypes: true });
const listFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  .map((entry) => entry.name)
  .sort();

const groupedTokens = new Map<number, Map<string, Token>>();

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

  if (!isTokenList(parsed)) {
    continue;
  }

  for (const maybeToken of parsed.tokens) {
    if (!isToken(maybeToken)) continue;

    const token: Token = { ...maybeToken };
    const chainId = token.chainId;
    const address = token.address.toLowerCase();

    const chainTokens = groupedTokens.get(chainId) ?? new Map<string, Token>();
    const existing = chainTokens.get(address);

    chainTokens.set(
      address,
      existing ? pickPreferredToken(existing, token) : token,
    );
    groupedTokens.set(chainId, chainTokens);
  }
}

if (groupedTokens.size === 0) {
  throw new Error(
    `No chain-indexed tokens found in source directory: ${sourceDir}`,
  );
}

mkdirSync(outputDir, { recursive: true });

let writtenFiles = 0;
for (const chainId of Array.from(groupedTokens.keys()).sort((a, b) => a - b)) {
  const tokens = Array.from(groupedTokens.get(chainId)?.values() ?? []).sort(
    compareTokens,
  );
  const chainList: TokenList = {
    name: `Arbitrum Token List - Chain ${chainId}`,
    timestamp: new Date().toISOString(),
    version: {
      major: 1,
      minor: 0,
      patch: 0,
    },
    tokens,
  };

  const outputPath = join(outputDir, `${chainId}.json`);
  writeFileSync(outputPath, JSON.stringify(chainList));
  writtenFiles += 1;
}

console.log(
  `Generated ${writtenFiles} chain list(s) in ${outputDir} from ${listFiles.length} source file(s).`,
);
