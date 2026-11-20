import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  site: process.env.ASTRO_SITE || 'https://www.vinje.de',
  base: process.env.ASTRO_BASE || '/',
  output: isGitHubPages ? 'static' : 'hybrid',
  adapter: isGitHubPages
    ? undefined
    : node({
        mode: 'standalone',
      }),
  integrations: [tailwind()],
});
