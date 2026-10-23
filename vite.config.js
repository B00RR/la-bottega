import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

function commitCorto() {
  const daAmbiente = process.env.VITE_COMMIT_SHA;
  if (daAmbiente) return daAmbiente.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: '/la-bottega/',
  define: {
    __COMMIT_SHA__: JSON.stringify(commitCorto()),
    __BUILD_DATE__: JSON.stringify(process.env.VITE_BUILD_DATE || new Date().toISOString()),
  },
});
