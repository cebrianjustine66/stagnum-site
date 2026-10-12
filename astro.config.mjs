import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

// Les pages du site restent du HTML statique. Seule l'interface d'édition (/keystatic)
// et son API tournent côté serveur, sur Vercel.
export default defineConfig({
  site: 'https://stagnum.fr',
  // L'interface d'édition appelle ses adresses sans barre oblique finale : on accepte les deux.
  // Les liens du site et l'adresse canonique gardent la barre finale.
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  adapter: vercel(),
  integrations: [
    sitemap({ filter: (page) => !/\/(merci|mentions-legales|confidentialite)\/$/.test(page) }),
    react(),
    keystatic(),
  ],
});
