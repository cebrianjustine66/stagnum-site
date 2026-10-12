# Site public Stagnum

Site vitrine de stagnum.fr, construit avec Astro (HTML statique).

- `npm run dev` : aperçu local
- `npm run build` : génère le site dans `dist/`

Où modifier quoi :

- **Prix, packs, engagement, essai** : `src/data/pricing.ts`
- **Textes des pages de fonctionnalités et de profils** : `src/data/pages.ts`
- **Articles de blog** : un fichier Markdown par article dans `src/pages/blog/`
- **Informations légales de l'éditeur** : `src/data/legal.ts`, à compléter avant la mise en ligne
- **Adresse de réception du formulaire** : `FORM_ENDPOINT` dans `src/data/site.ts`
