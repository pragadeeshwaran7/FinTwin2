// Runs the API (port 5001) and the Vite dev server (port 5173) together.
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const procs = [
  ['api', ['run', 'dev', '--prefix', 'backend'], '\x1b[36m'],
  ['web', ['run', 'dev', '--prefix', 'frontend'], '\x1b[35m'],
].map(([name, args, color]) => {
  const p = spawn(npm, args, { cwd: root, env: process.env });
  const prefix = (chunk) => chunk.toString().split('\n').filter(Boolean).map((l) => `${color}[${name}]\x1b[0m ${l}`).join('\n');
  p.stdout.on('data', (d) => console.log(prefix(d)));
  p.stderr.on('data', (d) => console.error(prefix(d)));
  p.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
    procs.forEach((q) => q.kill());
    process.exit(code ?? 0);
  });
  return p;
});
process.on('SIGINT', () => procs.forEach((p) => p.kill('SIGINT')));
