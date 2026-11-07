# Formulaire de devis du site → n8n → CRM de l'app interne + e-mails

Fiche pour la personne qui construit le flux n8n. Le site est déjà prêt : il suffit
de lui donner l'adresse du webhook.

## 1. Ce que le site envoie

- **Méthode** : `POST`
- **Format** : formulaire classique (`application/x-www-form-urlencoded`), une valeur par champ
- **Origine** : `https://stagnum.fr`, `https://www.stagnum.fr` et les aperçus Vercel (`https://*.vercel.app`)

| Champ | Contenu | Toujours présent |
|---|---|---|
| `nom` | Nom et prénom | oui |
| `societe` | Nom de l'entreprise | oui |
| `telephone` | Téléphone | oui |
| `email` | E-mail | oui |
| `rappel` | `Oui` si la personne veut être appelée, sinon `Non` | oui |
| `page` | Page d'où vient la demande (`/demande-de-devis/` ou `/tarifs/`) | oui |
| `message` | Message libre | non (peut être vide) |
| `activite` | `Indépendant`, `Entreprise sans magasin`, `Un magasin` ou `Plusieurs magasins` | page Demande de devis seulement |
| `briques` | Briques cochées, séparées par des virgules (ex. `Devis, Factures, Analyse d’eau`) | page Demande de devis seulement |
| `configuration` | Résumé de la calculette (équipe, briques, durée, prix estimé) | page Tarifs seulement |

Les robots (champ piège rempli) sont filtrés par le site : ils n'arrivent jamais au webhook.

## 2. Réglages du nœud Webhook

- HTTP Method : **POST**
- Options → **Allowed Origins (CORS)** : `https://stagnum.fr,https://www.stagnum.fr,https://*.vercel.app`
  (sans ça, le navigateur bloque l'envoi)
- Respond : **Using 'Respond to Webhook' Node**, avec ce nœud en dernier et un **code 200**,
  pour que le site n'affiche « Merci » qu'une fois la fiche bien créée dans le CRM.
  Le site affiche la page « Merci » seulement si la réponse est 2xx ; sinon il affiche
  « L'envoi a échoué ».

Les champs arrivent dans `{{$json.body.nom}}`, `{{$json.body.societe}}`, etc.

## 3. Écriture dans le CRM de l'app interne : l'API prospects

Ne pas écrire directement dans Supabase : l'app interne a une API qui crée les fiches au
bon format, repère les doublons et garde la clé secrète côté serveur.
Détail complet : `API-PROSPECTS.md` dans le dossier de l'app interne.

Nœud **HTTP Request**, juste après le Webhook :
- Method : `POST`
- URL : `https://stagnum.netlify.app/api/prospects`
- Authentication : *Generic Credential Type → Header Auth*,
  nom `Authorization`, valeur `Bearer <STAGNUM_API_TOKEN>` (jeton fourni à part)
- Send Body : *JSON → Using JSON* : `{{ JSON.stringify($json.body) }}`

Réponse : `{"ok": true, "nouvelle_entreprise": …, "entreprise": {…}}`. En cas d'erreur, le
champ `erreur` dit pourquoi (jeton, champ manquant, base indisponible).

Ce qui est créé : une entreprise « À contacter » avec la prochaine action
« Rappeler : demande de devis du site » pour aujourd'hui (réutilisée si elle existe déjà),
un contact et un échange « Mail » qui reprend toute la demande.

## 4. Les deux e-mails

Placés après l'API. Les champs du formulaire se reprennent depuis le Webhook, par exemple
`{{ $('Webhook').item.json.body.societe }}` ou `{{ $('Webhook').item.json.body.email }}`.

**À l'équipe** (alerte interne)
- Objet : `Nouvelle demande de devis : <societe>` (ajouter `— à rappeler` si `rappel = Oui`)
- Corps : tous les champs ci-dessus, avec le téléphone cliquable.

**Au pisciniste** (accusé de réception), à `<email>`
- Objet : `Votre demande de devis Stagnum`
- Proposition de texte (vouvoiement, court, ton du site) :

> Bonjour <nom>,
>
> Nous avons bien reçu votre demande de devis pour <societe>. Nous vous envoyons votre devis
> rapidement, et votre essai gratuit de 14 jours démarre avec.
> {si rappel = Oui} Vous avez demandé à être rappelé : nous vous appelons au <telephone>.
>
> À très vite,
> L'équipe Stagnum

## 5. Brancher le site

Coller l'adresse **Production URL** du webhook dans l'éditeur du site (`/edition`),
réglage « Adresse de réception du formulaire de devis », ou dans `src/content/site.json` → `formEndpoint`.
Tester ensuite une demande depuis l'aperçu Vercel : elle doit apparaître dans le CRM
de l'app interne et les deux e-mails doivent partir.
