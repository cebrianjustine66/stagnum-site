# Site public Stagnum

Site vitrine de stagnum.fr, construit avec Astro (HTML statique).

- `npm run dev` : aperçu local
- `npm run build` : génère le site dans `dist/`

Où modifier quoi :

- **Tout le contenu** (textes, articles, prix, menu, pied de page, formulaire, mentions légales) : dans l'interface d'édition, voir [EDITION.md](EDITION.md). Les fichiers correspondants sont dans `src/content/`.
- **Description des rubriques de l'interface** : `keystatic.config.ts` ; son habillage : `src/editor/`.
- **Démonstrations animées, icônes, couleurs, mise en page** : dans le code (`src/components/`, `src/styles/global.css`).
