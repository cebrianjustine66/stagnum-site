# Site public Stagnum

Site vitrine de stagnum.fr, construit avec Astro (HTML statique).

- `npm run dev` : aperçu local
- `npm run build` : génère le site dans `dist/`

Où modifier quoi :

- **Textes, articles de blog, questions fréquentes, blocs** : dans l'interface d'édition, voir [EDITION.md](EDITION.md). Les fichiers correspondants sont dans `src/content/`.
- **Prix, packs, engagement, essai** : `src/data/pricing.ts`
- **Informations légales de l'éditeur** : `src/data/legal.ts`, à compléter avant la mise en ligne
- **Adresse de réception du formulaire** : `FORM_ENDPOINT` dans `src/data/site.ts`
