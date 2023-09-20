import { getVersion } from '../../src/lib/getVersion';
import {
  baseList,
  majorList,
  minorList,
  patchList,
  withoutExtensions,
} from './getVersionMockup';

describe('getVersion', () => {
  it('Should return 1.0.0 version if no previous list is passed', () => {
    const version = getVersion(null, baseList().tokens);
    expect(version).toStrictEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });

    const versionWithoutExtensions = getVersion(
      null,
      withoutExtensions(baseList().tokens),
    );
    expect(versionWithoutExtensions).toStrictEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
  });

  it('Should not bump version if lists are equal', () => {
    const version = getVersion(baseList(), baseList().tokens);
    expect(version).toStrictEqual({
      major: 2,
      minor: 3,
      patch: 4,
    });

    const prevList = baseList();
    const versionWithoutExtensions = getVersion(
      {
        ...prevList,
        tokens: withoutExtensions(prevList.tokens),
      },
      withoutExtensions(baseList().tokens),
    );
    expect(versionWithoutExtensions).toStrictEqual({
      major: 2,
      minor: 3,
      patch: 4,
    });
  });

  it('Should bump patch version if extensions are different', () => {
    const [prevList, newList] = patchList();
    const version = getVersion(prevList, newList);
    expect(version).toStrictEqual({
      major: 2,
      minor: 3,
      patch: 5,
    });

    const versionWithoutExtensions = getVersion(
      {
        ...prevList,
        tokens: withoutExtensions(prevList.tokens),
      },
      withoutExtensions(newList),
    );
    expect(versionWithoutExtensions).toStrictEqual({
      major: 2,
      minor: 3,
      patch: 4,
    });
  });

  it('Should bump minor version if extensions are added', () => {
    const [prevList, newList] = minorList();
    const version = getVersion(prevList, newList);
    expect(version).toStrictEqual({
      major: 2,
      minor: 4,
      patch: 0,
    });

    const versionWithoutExtensions = getVersion(
      {
        ...prevList,
        tokens: withoutExtensions(prevList.tokens),
      },
      withoutExtensions(newList),
    );
    expect(versionWithoutExtensions).toStrictEqual({
      major: 2,
      minor: 3,
      patch: 4,
    });
  });

  it('Should bump major version if extensions are removed', () => {
    const [prevList, newList] = majorList();
    const version = getVersion(prevList, newList);
    expect(version).toStrictEqual({
      major: 3,
      minor: 0,
      patch: 0,
    });

    const versionWithoutExtensions = getVersion(
      {
        ...prevList,
        tokens: withoutExtensions(prevList.tokens),
      },
      withoutExtensions(newList),
    );
    expect(versionWithoutExtensions).toStrictEqual({
      major: 2,
      minor: 3,
      patch: 4,
    });
  });
});
