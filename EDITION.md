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

## En local ou en ligne

- **Sur cet ordinateur** (`npm run dev`) : l'interface enregistre dans les fichiers du dossier (`src/content/`). Il reste à les envoyer sur GitHub (« commit » puis « push »), avec GitHub Desktop ou Claude Code.
- **En ligne** (`https://<adresse du site>/keystatic`) : on se connecte avec son compte GitHub, et chaque enregistrement part directement dans GitHub. Vercel reconstruit alors le site tout seul, en une à deux minutes.

Tout le monde peut voir le site. Seules les personnes invitées sur le dépôt GitHub peuvent le modifier.

## Mise en place sur Vercel (une seule fois)

1. **Créer le projet Vercel** : sur vercel.com, se connecter avec GitHub, « Add New → Project », choisir le dépôt `cebrianjustine66/stagnum-site`. Vercel reconnaît Astro, il n'y a rien à régler.
2. **Créer la connexion GitHub de Keystatic** : sur l'ordinateur, lancer `npm run dev:github`, ouvrir http://127.0.0.1:4321/keystatic et suivre l'écran qui propose de créer l'application GitHub. À la fin, un fichier `.env` contient quatre lignes (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`). Ce fichier est secret : il ne part pas sur GitHub.
3. **Recopier ces quatre valeurs dans Vercel** : Project → Settings → Environment Variables, puis relancer un déploiement.
4. **Autoriser l'adresse du site** : dans les réglages de l'application GitHub créée à l'étape 2 (GitHub → Settings → Developer settings → GitHub Apps), ajouter l'adresse de retour `https://<adresse du site>/api/keystatic/github/oauth/callback`.

## Donner l'accès à une personne

1. Elle crée un compte GitHub (gratuit).
2. L'inviter sur le dépôt : GitHub → `cebrianjustine66/stagnum-site` → Settings → Collaborators → Add people, avec le droit d'écriture.
3. Elle ouvre `https://<adresse du site>/keystatic` et se connecte avec GitHub.

Pour retirer l'accès, la supprimer de la même liste.
