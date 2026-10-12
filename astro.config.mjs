import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://stagnum.fr',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: [
    sitemap({ filter: (page) => !/\/(merci|mentions-legales|confidentialite)\/$/.test(page) }),
  ],
});
