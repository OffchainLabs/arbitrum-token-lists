import {
  VersionUpgrade,
  diffTokenLists,
  minVersionBump,
  nextVersion,
} from '@uniswap/token-lists';
import { ArbTokenInfo, ArbTokenList } from './types';
import { isDeepStrictEqual } from 'util';

function createTokensMap(tokens: ArbTokenInfo[]) {
  return tokens
    .filter((token) => token.extensions)
    .reduce((acc, value) => {
      acc.set(value.address, value.extensions);
      return acc;
    }, new Map());
}

function getVersion(
  prevArbTokenList: ArbTokenList | null | undefined,
  arbifiedTokenList: ArbTokenInfo[],
) {
  if (!prevArbTokenList) {
    return {
      major: 1,
      minor: 0,
      patch: 0,
    };
  }

  let versionBump = minVersionBump(prevArbTokenList.tokens, arbifiedTokenList);
  const diff = diffTokenLists(prevArbTokenList.tokens, arbifiedTokenList);

  // Uniswap report changes if a token has extensions property
  const changedDiffKeys = Object.keys(diff.changed);
  const isOnlyExtensionsDiff =
    changedDiffKeys.length > 0 &&
    changedDiffKeys.every((chainId) => {
      return Object.values(diff.changed[Number(chainId)]).every((change) =>
        isDeepStrictEqual(change, ['extensions']),
      );
    });

  if (!isOnlyExtensionsDiff || versionBump !== VersionUpgrade.PATCH) {
    return nextVersion(prevArbTokenList.version, versionBump);
  }

  const prevTokens = createTokensMap(prevArbTokenList.tokens);
  const newTokens = createTokensMap(arbifiedTokenList);

  if (newTokens.size > prevTokens.size) {
    return nextVersion(prevArbTokenList.version, VersionUpgrade.MINOR);
  }

  if (newTokens.size < prevTokens.size) {
    return nextVersion(prevArbTokenList.version, VersionUpgrade.MAJOR);
  }

  versionBump = VersionUpgrade.NONE;
  for (const [key] of prevTokens) {
    const prevExtension = prevTokens.get(key);
    const newExtensions = newTokens.get(key);

    // Extensions were removed, bump to major
    if (prevExtension && !newExtensions) {
      return nextVersion(prevArbTokenList.version, VersionUpgrade.MAJOR);
    }

    // Extensions were added, bump to minor.
    if (!prevExtension && newExtensions) {
      versionBump = VersionUpgrade.MINOR;
    }

    if (!isDeepStrictEqual(prevExtension, newExtensions)) {
      // If versionBump was changed to MINOR, don't change it
      versionBump =
        versionBump === VersionUpgrade.MINOR
          ? versionBump
          : VersionUpgrade.PATCH;
    }
  }

  return nextVersion(prevArbTokenList.version, versionBump);
}

export { getVersion };
