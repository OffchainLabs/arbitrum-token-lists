import { execSync } from 'node:child_process';
import { posix as path } from 'node:path';
import process from 'node:process';

import { coreCommands, getOrbitCommands, Command } from './commandSets';

type Track = 'core' | 'orbit';

const bucket = process.env.AWS_BUCKET;
if (!bucket) {
  throw new Error('AWS_BUCKET environment variable is required');
}
const tokenListBaseUrl = 'https://tokenlist.arbitrum.io';

function parseArgs(): { track: Track; environment: string } {
  const [trackArg, environmentArg] = process.argv.slice(2);

  if (trackArg !== 'core' && trackArg !== 'orbit') {
    throw new Error(`Invalid track "${trackArg}". Expected "core" or "orbit".`);
  }

  return {
    track: trackArg,
    environment: environmentArg ?? 'Test',
  };
}

async function fetchOnlineVersion(path: string): Promise<string> {
  const url = `${tokenListBaseUrl}/${path}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return '1.0.0';
    }

    const version = (
      (await response.json()) as {
        version?: { major: string; minor: string; patch: string };
      }
    ).version || { major: '1', minor: '0', patch: '0' };
    return `${version.major}.${version.minor}.${version.patch}`;
  } catch (error) {
    console.warn(`Failed to fetch online version for ${url}:`, error);
    return '1.0.0';
  }
}

function runShellCommand(command: string) {
  execSync(command, {
    stdio: 'inherit',
    shell: '/bin/bash',
    env: process.env,
  });
}

function backupToS3(
  paths: string[],
  environment: string,
  onlineVersion: string,
) {
  const additionalPath = environment === 'Test' ? 'TestFolder/' : '';

  paths.forEach((path) => {
    const prefixedPath = `${additionalPath}${path}`;
    const listCommand = `aws s3 ls "s3://${bucket}/${prefixedPath}"`;

    try {
      const result = execSync(listCommand, {
        stdio: 'pipe',
        shell: '/bin/bash',
        env: process.env,
      }).toString();

      if (result.trim().length === 0) {
        return;
      }

      const pathWithoutExtension = path.replace(/\.json$/, '');
      const command = `aws s3 cp "s3://${bucket}/${prefixedPath}" "s3://${bucket}/${additionalPath}${pathWithoutExtension}/${onlineVersion}.json"`;

      runShellCommand(command);
    } catch (error) {
      // If the file doesn't exist, skip backup for this path.
      console.log(
        `Skipping backup for s3://${bucket}/${prefixedPath} (not found).`,
      );
    }
  });
}

function deploy(paths: string[], environment: string) {
  if (!paths.length) {
    throw new Error('Expected at least one path to sync');
  }

  const additionalPath = environment === 'Test' ? 'TestFolder/' : '';

  paths.forEach((relativePath) => {
    const pathDir = path.dirname(relativePath);
    const normalizedSourceDir = pathDir === '.' ? './src' : `./src/${pathDir}`;
    const normalizedDestDir = `s3://${bucket}/${additionalPath}${
      pathDir === '.' ? '' : `${pathDir}`
    }`;

    let command = `aws s3 sync "${normalizedSourceDir}" "${normalizedDestDir}" --exclude "*" --include "${path.basename(
      relativePath,
    )}"`;

    if (environment === 'CI') {
      command += ' --acl public-read';
    }

    runShellCommand(command);
  });
}

async function runCommands(commands: Command[], environment: string) {
  const failedCommands: string[] = [];

  for (const command of commands) {
    console.log(`\n=== Running ${command.name} ===`);

    try {
      runShellCommand(command.command);
    } catch (error) {
      console.error(`Command failed: ${command.name}`);
      failedCommands.push(command.name);
      continue;
    }

    if (command.version) {
      if (!command.paths.length) {
        console.error(
          `Command ${command.name} expected at least one path for versioning.`,
        );
        failedCommands.push(command.name);
        continue;
      }

      const onlineVersion = await fetchOnlineVersion(command.paths[0]);

      try {
        backupToS3(command.paths, environment, onlineVersion);
      } catch (error) {
        console.error(`Backup failed for ${command.name}:`, error);
        failedCommands.push(command.name);
        continue;
      }
    }

    if (!command.paths.length) {
      console.error(`Command ${command.name} produced no output paths.`);
      failedCommands.push(command.name);
      continue;
    }

    try {
      deploy(command.paths, environment);
    } catch (error) {
      console.error(`Deploy failed for ${command.name}:`, error);
      failedCommands.push(command.name);
      continue;
    }
  }

  if (failedCommands.length > 0) {
    console.error('\nThe following commands failed:');
    for (const name of failedCommands) {
      console.error(` - ${name}`);
    }
    process.exit(1);
  }
}

async function main() {
  const { track, environment } = parseArgs();

  const commands = track === 'core' ? coreCommands : await getOrbitCommands();
  await runCommands(commands, environment);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
