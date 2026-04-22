import { spawn } from 'node:child_process';
import { buildAppEnv, REPO_ROOT } from './root-env.mjs';

const yarnBin = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
const [mode, app, ...args] = process.argv.slice(2);

if (!mode || !app || args.length === 0) {
  console.error(
    'Usage: node ./scripts/run-workspace.mjs <development|production> <web|api> <yarn-args...>',
  );
  process.exit(1);
}

const workspace = app === 'web'
  ? 'orot-web'
  : app === 'api'
    ? 'orot-api'
    : null;

if (!workspace) {
  console.error(`Unknown app target: ${app}`);
  process.exit(1);
}

const child = spawn(
  yarnBin,
  ['--cwd', workspace, ...args],
  {
    cwd: REPO_ROOT,
    env: buildAppEnv(app, mode),
    stdio: 'inherit',
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
