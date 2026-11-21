import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

import preact from '@astrojs/preact';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  site: process.env.ASTRO_SITE || 'https://www.vinje.de',
  base: process.env.ASTRO_BASE || '/',
  output: isGitHubPages ? 'static' : 'server',

  adapter: isGitHubPages
    ? undefined
    : node({
        mode: 'standalone',
      }),

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [preact()],
});