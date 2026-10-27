import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Published at https://gpu-execution-idle.github.io/hotnets26-poster/ (see ../projects.json).
// Override with BASE_PATH=/other/ to host elsewhere.
const base = process.env.BASE_PATH ?? '/hotnets26-poster/';

// Static hosts serve /poster/ only if a file exists there: give it its own copy of the app shell.
const posterRoute = (): Plugin => ({
  name: 'poster-route',
  apply: 'build',
  closeBundle() {
    const dist = resolve(__dirname, 'dist');
    mkdirSync(resolve(dist, 'poster'), { recursive: true });
    copyFileSync(resolve(dist, 'index.html'), resolve(dist, 'poster/index.html'));
  },
});

export default defineConfig({ base, plugins: [react(), posterRoute()] });
