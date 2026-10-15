# Modifier le contenu du site

## L'éditeur visuel (/edition)

On modifie le site directement sur ses pages, sans code à retenir.

- **En ligne** : ouvrir `https://<adresse du site>/edition` et se connecter avec son compte GitHub (une seule fois).
- **Sur cet ordinateur** : lancer `npm run dev`, puis ouvrir http://127.0.0.1:4321/edition.

Comment s'en servir :

1. **Choisir la page** avec le menu « Page » en haut, ou en cliquant sur les liens du site.
2. **Cliquer sur un texte** pour l'écrire directement. Une petite barre apparaît au-dessus : *Surligner* (le trait orange des titres), *Lien*, *Insérer* (nombre de jours d'essai, nombre de briques…, qui se mettent à jour tout seuls).
3. **Survoler un élément d'une liste** (arguments, questions fréquentes, étapes…) pour l'*ajouter*, le *déplacer* ou le *retirer*.
4. **Le panneau de droite** montre tous les champs de la page, y compris ceux qu'on ne voit pas à l'écran : référencement Google, blocs supplémentaires, réglages. L'onglet *Tout le site* regroupe le menu, les boutons, le formulaire et les prix.
5. **Publier** (en ligne) ou **Enregistrer** (sur l'ordinateur). En ligne, le site se met à jour tout seul en une à deux minutes.

Les modifications non publiées restent gardées dans le navigateur, même si on ferme la page.
Si quelqu'un a modifié la même rubrique entre-temps, l'éditeur prévient au lieu d'écraser son travail.

Ce que l'éditeur visuel ne fait pas encore : le texte des **articles du blog** et les **photos de l'équipe**. Pour ceux-là, utiliser l'ancien éditeur décrit ci-dessous (/keystatic).

## L'ancien éditeur (/keystatic)

### Ouvrir l'interface

1. Dans le dossier du site, lancer `npm run dev`.
2. Ouvrir http://127.0.0.1:4321/keystatic dans le navigateur.

Le site lui-même est visible à côté, sur http://127.0.0.1:4321/ : chaque enregistrement s'y voit tout de suite.

### Ce qui se modifie

Le menu de gauche suit l'organisation du site. Dans chaque page, les sections sont numérotées dans l'ordre où elles apparaissent à l'écran, et l'icône ↗ en haut à droite ouvre la page correspondante du site.

| Rubrique | Ce qu'on y modifie |
|---|---|
| **Accueil** | Tous les titres, textes, listes, exemples et questions fréquentes de l'accueil. |
| **Tarifs (textes)** | Les textes de la page tarifs et de la calculette, les « toujours inclus », les exemples de prix (le montant se calcule tout seul), les questions fréquentes. |
| **Pages de fonctionnalités** | Les pages Devis, Factures, Chantiers… Le bouton « + » en crée une nouvelle, qui s'ajoute au menu. |
| **Qui sommes-nous** | L’histoire de Stagnum, l’équipe (prénoms et rôles), les partis pris. |
| **Comparatif Extrabat** | Le tableau, les situations, le test, les questions fréquentes, la date du relevé. |
| **Demande de devis** | Le titre, l'introduction et la liste « Ce que vous obtenez ». |
| **Pages « Merci » et « Introuvable »** | Les deux petites pages de message. |
| **Articles** | Tous les articles du blog. Le bouton « + » en crée un. |
| **Page d'accueil du blog** | Le titre, l'introduction et les intitulés de la liste des articles. |
| **Prix et briques** | Les prix, les remises, la durée de l'essai, le nom et la phrase de chaque brique. |
| **Menu et pied de page** | Les liens et intitulés du menu du haut et du pied de page. |
| **Boutons et textes répétés** | Les boutons et encadrés qui reviennent sur plusieurs pages. |
| **Formulaire de devis** | Les intitulés des champs, le bouton, les messages d'erreur. |
| **Réglages généraux** | La description de Stagnum pour Google et l'adresse qui reçoit les demandes de devis. |
| **Mentions légales et confidentialité** | Les informations de l'éditeur et le texte des deux pages. |

Chaque page a aussi une section **Référencement (Google)** : le titre et la description affichés dans les résultats de recherche.

### Créer un article

1. **Articles** → bouton « + ».
2. Saisir le titre (l'adresse se remplit toute seule) et le résumé.
3. Écrire le texte au centre. La barre du haut donne les titres, le gras, les listes, les liens et les tableaux.
4. **Créer**. L'article apparaît en tête du blog.

Le thème, la date, le temps de lecture, l'icône et la couleur ont une valeur par défaut.

### Trois écritures à connaître

- `*un passage*` entre astérisques : le passage est surligné, comme dans les titres actuels.
- `[texte du lien](/tarifs/)` : un lien.
- `{essai}`, `{nb_briques}`, `{toutes}` : remplacés par le nombre de jours d'essai et le nombre de briques (en chiffres, en lettres). Ils suivent tout seuls la rubrique « Prix et briques ».

L'aide sous chaque champ rappelle ce qui s'applique.

### Ajouter des blocs

En bas des pages Accueil, Tarifs, Comparatif et de chaque page de fonctionnalité, la rubrique **Blocs supplémentaires** permet d'empiler des sections : bouton « Ajouter », puis choisir le type.

- **Texte** : un titre et des paragraphes ;
- **Liste à coches** : un titre et une liste ;
- **Cartes** : une rangée d'encadrés avec icône, titre et texte ;
- **Étapes numérotées** : des ronds numérotés reliés par une ligne ;
- **Équipe** : un texte, les cartes des membres (réglées dans « Qui sommes-nous ») et un bouton ;
- **Appel à l'action** : le bandeau turquoise avec les deux boutons ;
- **Questions fréquentes** : une série de questions et réponses.

Les blocs se glissent pour changer d'ordre et s'affichent en bas de la page, avec les couleurs du site.

### Ce qui ne se modifie pas dans l'interface

- **Les démonstrations animées** (écrans de l'application en haut des pages, mini-aperçus des briques, fenêtre de réglages de l'accueil) : ce sont des animations programmées.
- **Les phrases calculées de la calculette** (« Soit 240 € HT par mois pour vos 2 magasins », économie réalisée…) : elles sont composées avec les montants.
- **Le logo, les icônes, les couleurs et la mise en page**, ainsi que l'image de partage sur les réseaux sociaux.
- **Ajouter ou retirer une brique** : il faut aussi son icône et sa démonstration.
- **L'adresse des pages fixes** (/tarifs/, /blog/, /alternative-extrabat/…).

Pour ces points, il faut passer par le code.

### En local ou en ligne

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
