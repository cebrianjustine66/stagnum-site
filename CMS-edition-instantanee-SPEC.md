# CMS « édition en place, instantanée » — spécification

_Document de cadrage. Rédigé le 15 novembre 2026. À valider avant tout développement._

## 1. Ce qu'on veut

Un CMS qui garde l'expérience de l'éditeur maison actuel (`/edition`) :

- on navigue sur le **site normal** ;
- on clique sur **« Modifier »** et on édite le texte **directement sur la page** (en place) ;
- on peut **ajouter des pages préconstruites** (un article de blog, par exemple) à partir d'un modèle ;

**mais** chaque modification doit être **instantanée**, sans déclencher un déploiement GitHub + rebuild Vercel à chaque changement de texte.

## 2. Le problème aujourd'hui

Le site est en **Astro statique** : le contenu vit dans des fichiers du repo (`src/content/`) et est « cuit » dans le site **au moment du build**. Donc toute modification = modifier un fichier = **commit GitHub → Vercel reconstruit tout le site** (≈ 1 à 2 min). L'éditeur maison (`src/edition/`) comme Keystatic (`src/editor/`) écrivent tous les deux dans GitHub.

> Tant que le contenu vit **dans le repo**, le rebuild est inévitable. La seule façon d'avoir des modifs instantanées, c'est de sortir le contenu du repo.

## 3. Principe cible

Déplacer le contenu éditable **du repo vers une base lue en direct par le site**.

```
Aujourd'hui :  éditer → commit GitHub → rebuild Vercel → en ligne   (lent)
Cible       :  éditer → écrire dans la base → relu en direct        (instantané)
```

- **« Modifier » une page** → enregistre dans la base → visible tout de suite.
- **Ajouter un article de blog** → crée une entrée dans la base à partir d'un modèle → éditable aussitôt.
- L'éditeur en place (le « maison ») **reste tel quel côté expérience** ; seule sa destination change : il écrit dans une **API**, plus dans GitHub.

C'est exactement le fonctionnement de **l'app interne** (Cloudflare Workers + stockage KV lu en direct) — donc une techno déjà maîtrisée par l'équipe.

## 4. Architecture recommandée

**Recommandé** (à valider) : aligner le site sur la stack de l'app interne.

| Brique | Choix recommandé | Pourquoi |
|---|---|---|
| Rendu du site | Astro en **SSR/hybride** servi par un **Cloudflare Worker** (ou Vercel SSR) | Le site lit le contenu à la volée au lieu d'être figé au build |
| Stockage du contenu | **Cloudflare KV** (clé → valeur JSON) pour commencer ; **D1** (SQL) si on veut des requêtes structurées (listes d'articles, filtres) | Même brique que l'app interne ; instantané en écriture |
| API lecture/écriture | Routes `/api/...` du Worker (lire un bloc, enregistrer un bloc, créer une page) | Point d'entrée unique de l'éditeur |
| Éditeur en place | On **reprend `src/edition/`** (navigation + bouton Modifier + édition inline) en le branchant sur l'API au lieu de GitHub | On garde l'expérience qui te plaît |
| Authentification | **Compte Stagnum** (réutiliser l'OAuth de l'app interne si possible) | Cohérent, pas un nouveau système |
| Médias / photos | Stockage objet (Cloudflare R2) + upload depuis l'éditeur | Résout le point que l'éditeur maison ne gère pas encore |

**Décision (voir §7) : on reste sur Vercel.** Concrètement, le tableau ci-dessus s'adapte ainsi : le rendu « lu en direct » se fait en **Vercel SSR** (au lieu d'un Worker Cloudflare), et le contenu est stocké dans une **base SQL compatible Vercel** (ex. Vercel Postgres / Neon / Supabase) au lieu de Cloudflare KV. Le **principe reste identique** : le site lit le contenu dans la base, l'éditeur l'y écrit, c'est instantané.

## 5. Modèle de contenu

- **Blocs éditables** : chaque zone de texte d'une page porte une **clé stable** (ex. `accueil.hero.titre`). L'éditeur lit/écrit par cette clé.
- **Pages** : un document = une page (ses blocs + ses métadonnées SEO : titre, description, slug).
- **Modèles (templates)** : des structures de page préconstruites. Le **blog** est le premier : un article = titre, image, chapô, corps, date, auteur, slug. « Ajouter un article » = créer une entrée depuis ce modèle, immédiatement éditable.
- **Reprise** : on importe le contenu actuel de `src/content/` dans la base au démarrage (migration unique).

## 6. Le parcours « Modifier » (cible)

1. Un membre connecté (compte Stagnum) navigue sur le site normal.
2. Il clique **« Modifier »** → la page passe en mode édition en place.
3. Il change un texte / remplace une image / crée un article.
4. **Enregistrer** → l'API écrit dans la base → **la page affiche la nouvelle version immédiatement** (pas de commit, pas de rebuild).
5. Les visiteurs voient le changement dès que le cache de la page est rafraîchi (invalidation ciblée à l'enregistrement → quasi immédiat).

## 7. Décisions prises (15 novembre 2026)

- [x] **Brouillon → publication** : OUI. On édite en **brouillon** (visible seulement de l'équipe), puis un bouton **« Publier »** met en ligne. Les visiteurs ne voient que le contenu publié.
- [x] **Historique / annuler** : OUI. On garde les versions de chaque page/bloc pour pouvoir **revenir en arrière**.
- [x] **Édition à plusieurs** : OUI. Plusieurs membres peuvent éditer ; on gère les accès et le cas où deux personnes modifient la même page.
- [x] **Hébergement** : on **garde l'hébergement actuel (Vercel)**. Pas de bascule vers Cloudflare.

**Conséquences techniques (mon périmètre — aucune décision attendue de Justine) :**
- **Base** : une vraie base **structurée (type SQL, compatible Vercel)** plutôt qu'un simple classeur clé-valeur — nécessaire pour l'historique, les brouillons et le travail à plusieurs.
- **Rendu** : le site passe en mode « lu en direct » sur **Vercel (SSR)**, avec cache pour rester rapide.
- **Keystatic** : gardé en secours pendant la transition, retiré une fois l'éditeur maison complet.

## 8. Compromis assumés

- Le site n'est plus **100 % statique** : il devient dynamique (il lit la base). Compensé par un **cache CDN** → reste rapide. On fait déjà tourner un backend Cloudflare.
- On **perd l'historique Git** du contenu (qui a changé quoi). → À remplacer par un **historique maison** dans la base si on le juge utile.
- Un peu de **dev au départ** : base + API + branchement de l'éditeur + migration du contenu + upload d'images.

## 9. Étapes de livraison proposées

1. **Prototype** : sur **une** page réelle, un bouton « Modifier » qui enregistre un texte dans la base, relu en direct, sans rebuild. Preuve de concept.
2. **MVP** : toutes les pages de contenu éditables en place + upload d'images + le modèle **blog** (créer/éditer/supprimer un article).
3. **Complet** : historique/annuler, brouillon/publication si retenu, retrait de Keystatic, et bascule d'hébergement si on quitte Vercel.

_(Effort à estimer une fois les décisions du §7 tranchées — pas de chiffre avancé tant que le périmètre n'est pas figé.)_

## 10. Ce qu'on garde / ce qu'on abandonne

- **On garde** : l'éditeur en place « maison » (navigation + Modifier + édition inline), l'expérience qui plaît.
- **On abandonne** : le commit GitHub **à chaque modification de texte** (donc le rebuild systématique).
- **Le code reste** dans le repo `cebrianjustine66/stagnum-site` ; seul le **contenu** sort du repo vers la base.
