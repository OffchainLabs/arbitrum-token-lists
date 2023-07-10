import {
  Version,
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

function getVersionWithExtensions(
  prevArbTokenList: ArbTokenList,
  arbifiedTokenList: ArbTokenInfo[],
  versionBump: VersionUpgrade,
) {
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
      if (versionBump !== VersionUpgrade.MINOR) {
        versionBump = VersionUpgrade.PATCH;
      }
    }
  }

  return nextVersion(prevArbTokenList.version, versionBump);
}

function getVersion(
  prevArbTokenList: ArbTokenList | null | undefined,
  arbifiedTokenList: ArbTokenInfo[],
): Version {
  if (!prevArbTokenList) {
    return {
      major: 1,
      minor: 0,
      patch: 0,
    };
  }

  const versionBump = minVersionBump(
    prevArbTokenList.tokens,
    arbifiedTokenList,
  );
  const diff = diffTokenLists(prevArbTokenList.tokens, arbifiedTokenList);

  // Uniswap bump version to PATCH if any token has extensions property
  const chainIds = Object.keys(diff.changed);
  const isOnlyExtensionsDiff = chainIds.every((chainId) => {
    const changes = new Set(...Object.values(diff.changed[Number(chainId)])); // Use set to remove all duplicates
    return changes.size === 1 && changes.has('extensions');
  });

  // If we only have ['extensions'] changes, we need to check if the change is a false positive
  if (!isOnlyExtensionsDiff || versionBump !== VersionUpgrade.PATCH) {
    return nextVersion(prevArbTokenList.version, versionBump);
  }

  return getVersionWithExtensions(
    prevArbTokenList,
    arbifiedTokenList,
    versionBump,
  );
}

export { getVersion };
