// Branche l'interface d'édition Keystatic sur /keystatic.
// Reprend l'intégration officielle (@keystatic/astro) en remplaçant sa page par la nôtre
// (src/editor/page.astro) pour l'habiller aux couleurs de Stagnum.
import { mkdirSync, writeFileSync } from 'node:fs';

export default function editor() {
  return {
    name: 'stagnum-editor',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig, config }) => {
        updateConfig({
          server: config.server.host ? {} : { host: '127.0.0.1' },
          vite: {
            plugins: [{
              name: 'keystatic',
              resolveId(id) {
                if (id === 'virtual:keystatic-config') return this.resolve('./keystatic.config', './a');
                return null;
              },
            }],
            optimizeDeps: { entries: ['keystatic.config.*', '.astro/keystatic-imports.js'] },
          },
        });
        const dotAstroDir = new URL('./.astro/', config.root);
        mkdirSync(dotAstroDir, { recursive: true });
        writeFileSync(new URL('keystatic-imports.js', dotAstroDir), 'import "@keystatic/astro/ui";\nimport "@keystatic/astro/api";\nimport "@keystatic/core/ui";\n');
        injectRoute({ entrypoint: './src/editor/page.astro', pattern: '/keystatic/[...params]', prerender: false });
        injectRoute({ entrypoint: '@keystatic/astro/internal/keystatic-api.js', pattern: '/api/keystatic/[...params]', prerender: false });
      },
    },
  };
}
