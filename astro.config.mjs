import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// L'interface d'édition (/keystatic) n'est chargée qu'en local, avec `npm run dev`.
// Le site construit par `npm run build` reste du HTML statique, sans rien de plus.
const editing = process.argv.includes('dev');

export default defineConfig({
  site: 'https://stagnum.fr',
  // L'interface d'édition appelle ses adresses sans barre oblique finale.
  trailingSlash: editing ? 'ignore' : 'always',
  devToolbar: { enabled: false },
  integrations: [
    sitemap({ filter: (page) => !/\/(merci|mentions-legales|confidentialite)\/$/.test(page) }),
    ...(editing ? [react(), keystatic()] : []),
  ],
});
