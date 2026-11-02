import { LifiConnection, LifiToken, TokenListEntry } from './types';

const RETRIES = 3;
const LIFI_API_URL = 'https://li.quest/v1';

export class HttpError extends Error {
  constructor(readonly status: number, url: string) {
    super(`Request to ${url} failed with ${status}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries network errors, rate limits and server errors.
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let response: Response | undefined;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (attempt >= RETRIES) {
        throw error;
      }
    }

    if (response?.ok) {
      return (await response.json()) as T;
    }
    if (
      response &&
      ((response.status !== 429 && response.status < 500) || attempt >= RETRIES)
    ) {
      throw new HttpError(response.status, url);
    }
    await sleep(2 ** attempt * 5_000);
  }
}

// S3 answers 403 for a list that does not exist, for example an Orbit list that was never
// generated. Any other failure stops the generation.
export async function fetchTokenList(url: string): Promise<TokenListEntry[]> {
  try {
    const list = await fetchJson<{ tokens: TokenListEntry[] }>(url);
    return list.tokens;
  } catch (error) {
    if (
      error instanceof HttpError &&
      (error.status === 403 || error.status === 404)
    ) {
      console.warn(`Skipping missing token list ${url}`);
      return [];
    }
    throw error;
  }
}

function lifiInit(): RequestInit {
  const apiKey = process.env.LIFI_API_KEY;
  return apiKey ? { headers: { 'x-lifi-api-key': apiKey } } : {};
}

export async function fetchLifiChainIds(): Promise<Set<number>> {
  const { chains } = await fetchJson<{ chains: { id: number }[] }>(
    `${LIFI_API_URL}/chains`,
    lifiInit(),
  );
  return new Set(chains.map((chain) => chain.id));
}

export async function fetchLifiTokens(chainId: number): Promise<LifiToken[]> {
  const { tokens } = await fetchJson<{ tokens: Record<string, LifiToken[]> }>(
    `${LIFI_API_URL}/tokens?chains=${chainId}`,
    lifiInit(),
  );
  return tokens[String(chainId)] ?? [];
}

type LifiConnectionResponse = {
  connections: {
    fromChainId: number;
    toChainId: number;
    fromTokens: { address: string }[];
    toTokens: { address: string }[];
  }[];
};

export async function fetchLifiConnection({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: number;
  destinationChainId: number;
}): Promise<LifiConnection | null> {
  const { connections } = await fetchJson<LifiConnectionResponse>(
    `${LIFI_API_URL}/connections?fromChain=${sourceChainId}&toChain=${destinationChainId}`,
    lifiInit(),
  );
  const connection = connections.find(
    (candidate) =>
      candidate.fromChainId === sourceChainId &&
      candidate.toChainId === destinationChainId,
  );
  if (!connection) {
    return null;
  }

  const toAddresses = (tokens: { address: string }[]) => [
    ...new Set(tokens.map((token) => token.address.toLowerCase())),
  ];
  return {
    fromTokens: toAddresses(connection.fromTokens),
    toTokens: toAddresses(connection.toTokens),
  };
}
