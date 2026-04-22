import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { buildAppEnv, REPO_ROOT } from './root-env.mjs';

const yarnBin = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';

const services = [
  {
    name: 'api',
    color: '\u001b[36m',
    cmd: yarnBin,
    args: ['--cwd', 'orot-api', 'start:dev'],
    env: buildAppEnv('api', 'development'),
  },
  {
    name: 'web',
    color: '\u001b[35m',
    cmd: yarnBin,
    args: ['--cwd', 'orot-web', 'dev'],
    env: buildAppEnv('web', 'development'),
  },
];

const reset = '\u001b[0m';
const children = new Map();
let shuttingDown = false;
let finalExitCode = 0;

function prefixFor(service) {
  return `${service.color}[${service.name}]${reset}`;
}

function log(service, message) {
  process.stdout.write(`${prefixFor(service)} ${message}\n`);
}

function pipeOutput(service, stream) {
  if (!stream) {
    return;
  }

  const reader = createInterface({ input: stream });
  reader.on('line', (line) => {
    log(service, line);
  });
}

function killAll(signal = 'SIGTERM') {
  for (const child of children.values()) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function finish(exitCode = 0) {
  finalExitCode = exitCode;

  if (!shuttingDown) {
    shuttingDown = true;
    killAll();
  }

  if (children.size === 0) {
    process.exit(finalExitCode);
  }
}

for (const service of services) {
  const child = spawn(service.cmd, service.args, {
    cwd: REPO_ROOT,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: service.env,
  });

  children.set(service.name, child);
  pipeOutput(service, child.stdout);
  pipeOutput(service, child.stderr);

  child.on('error', (error) => {
    log(service, `failed to start: ${error.message}`);
    finish(1);
  });

  child.on('exit', (code, signal) => {
    children.delete(service.name);

    if (signal) {
      log(service, `stopped by ${signal}`);
      if (!shuttingDown && finalExitCode === 0) {
        finalExitCode = 1;
      }
    } else {
      log(service, `exited with code ${code ?? 0}`);
      if ((code ?? 0) !== 0 && finalExitCode === 0) {
        finalExitCode = code ?? 1;
      }
    }

    if (!shuttingDown) {
      shuttingDown = true;
      killAll();
    }

    if (children.size === 0) {
      process.exit(finalExitCode);
    }
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    killAll(signal);

    setTimeout(() => {
      killAll('SIGKILL');
    }, 5_000).unref();
  });
}
