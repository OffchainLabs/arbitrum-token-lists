import {
  createOrbitTokenListCommand,
  generateOrbitCommands,
} from '../../.github/scripts/generateMatrix';

const network = {
  name: 'Orbit Chain',
  chainId: 1234,
  parentChainId: 42161,
};

const listExists = async () => ({
  json: async () => ({}),
});

describe('Orbit matrix generation', () => {
  it('uses the merged output name, source flags, and previous-list URL', async () => {
    const [command] = await generateOrbitCommands([network], listExists);

    expect(command.paths).toEqual(['ArbTokenLists/1234_arbed.json']);
    expect(command.command).toContain(
      '--prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/1234_arbed.json',
    );
    expect(command.command).toContain(
      '--tokenList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs.json',
    );
    expect(command.command.match(/--inputTokenList/g)).toHaveLength(2);
  });

  it('generates when Uniswap is missing but another source exists', async () => {
    const command = await createOrbitTokenListCommand(
      network,
      [undefined, 'https://example.com/coingecko.json'],
      listExists,
    );

    expect(command.command).toContain(
      '--tokenList https://example.com/coingecko.json',
    );
    expect(command.command).not.toContain('undefined');
  });

  it('throws when no sources exist', async () => {
    await expect(
      createOrbitTokenListCommand(
        network,
        [undefined, undefined, undefined],
        listExists,
      ),
    ).rejects.toThrow(
      "Token lists on parent chain don't exist for Orbit Chain (1234)",
    );
  });

  it('ignores the previous list when the output does not exist', async () => {
    const command = await createOrbitTokenListCommand(
      network,
      ['https://example.com/uniswap.json'],
      async () => {
        throw new Error('Not found');
      },
    );

    expect(command.command).toContain('--ignorePreviousList');
  });
});
