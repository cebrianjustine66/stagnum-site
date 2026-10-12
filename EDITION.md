# Modifier le contenu du site

Le contenu du site se modifie dans une interface d'édition, sans toucher au code.

## Ouvrir l'interface

1. Dans le dossier du site, lancer `npm run dev`.
2. Ouvrir http://127.0.0.1:4321/keystatic dans le navigateur.

Le site lui-même est visible à côté, sur http://127.0.0.1:4321/ : chaque enregistrement s'y voit tout de suite.

## Ce qui se modifie

| Dans l'interface | Ce que c'est |
|---|---|
| **Articles de blog** | Tous les articles. Le bouton « + » en crée un nouveau. |
| **Page d'accueil** | Titres, textes, listes et questions fréquentes de l'accueil. |
| **Page des tarifs** | Titres, textes et questions fréquentes de la page tarifs. |
| **Pages de fonctionnalités** | Les pages Devis, Factures, Chantiers… et leurs questions fréquentes. |

Les prix restent dans `src/data/pricing.ts` et les mentions légales dans `src/data/legal.ts`.

## Trois écritures à connaître

- `*un passage*` entre astérisques : le passage est surligné, comme dans les titres actuels.
- `[texte du lien](/tarifs/)` : un lien.
- `{essai}`, `{nb_briques}`, `{toutes}` : remplacés par le nombre de jours d'essai et le nombre de briques (en chiffres, en lettres). Ils suivent tout seuls les réglages des tarifs.

## Ajouter des blocs

En bas de la page d'accueil, de la page des tarifs et de chaque page de fonctionnalité, la rubrique **Blocs supplémentaires** permet d'empiler des blocs :

- **Texte** : un titre et des paragraphes ;
- **Liste à puces** : un titre et une liste à coches ;
- **Cartes** : une rangée de cartes avec icône, titre et texte ;
- **Appel à l'action** : le bandeau turquoise avec les deux boutons ;
- **Questions fréquentes** : une série de questions et réponses.

Les blocs se glissent pour changer d'ordre. Ils s'affichent en bas de la page, avec les couleurs du site.

## Mettre les modifications en ligne

Pour l'instant, l'interface enregistre les modifications dans les fichiers du site, sur cet ordinateur (dossier `src/content/`). Il reste à les envoyer sur GitHub (« commit » puis « push »), avec GitHub Desktop ou Claude Code.

## Donner l'accès à d'autres personnes

Aujourd'hui l'interface ne fonctionne que sur l'ordinateur où le site est installé. Pour que d'autres personnes modifient le site depuis leur navigateur, il faut :

1. **Héberger le site** chez un hébergeur qui sait faire tourner l'interface : Vercel, Netlify ou Cloudflare.
2. **Passer Keystatic en mode GitHub** : dans `keystatic.config.ts`, remplacer `storage: { kind: 'local' }` par `storage: { kind: 'github', repo: 'cebrianjustine66/stagnum-site' }`, ajouter l'adaptateur de l'hébergeur dans `astro.config.mjs` et y retirer la condition `editing`. Au premier lancement, Keystatic guide la création de l'application GitHub qui sert à se connecter.
3. **Inviter chaque personne** sur le dépôt GitHub `cebrianjustine66/stagnum-site` (Settings → Collaborators), avec le droit d'écriture. Il lui faut un compte GitHub, gratuit.

Ensuite chacun ouvre `https://<adresse du site>/keystatic`, se connecte avec GitHub et modifie le contenu. Chaque enregistrement arrive dans GitHub et le site se remet à jour tout seul en une à deux minutes.
