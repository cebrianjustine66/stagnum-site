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
- Respond : **When Last Node Finishes** (ou un nœud *Respond to Webhook*) avec un **code 200**.
  Le site affiche la page « Merci » seulement si la réponse est 2xx ; sinon il affiche
  « L'envoi a échoué ».

Les champs arrivent dans `{{$json.body.nom}}`, `{{$json.body.societe}}`, etc.

## 3. Écriture dans le CRM de l'app interne

L'app interne stocke tout dans **Supabase**, table `stagnum_kv` (colonnes `key`, `value` jsonb,
`updated_at`). Un enregistrement par élément, avec une clé `collection/id`.
Utiliser le nœud Supabase (ou HTTP Request vers `/rest/v1/stagnum_kv` avec l'en-tête
`Prefer: resolution=merge-duplicates`) pour insérer **trois lignes** :

Générer un `id` court et unique par élément (l'app utilise
`Date.now().toString(36) + Math.random().toString(36).slice(2,7)`).

**Entreprise** — clé `companies/<id>`
```json
{
  "id": "<id>",
  "name": "<societe>",
  "type": "Installateur si activite = Indépendant ou Entreprise sans magasin, sinon Magasin",
  "city": "", "dept": "", "size": "", "parentId": "", "owners": [],
  "doNotContact": false,
  "stage": "À contacter",
  "nextAction": "Rappeler : demande de devis du site",
  "nextDate": "<date du jour, AAAA-MM-JJ>",
  "lostReason": "", "lostFrom": "",
  "phone": "<telephone>",
  "source": "Site web"
}
```

**Contact** — clé `contacts/<id>`
```json
{ "id": "<id>", "companyId": "<id de l'entreprise>", "name": "<nom>", "role": "",
  "phone": "<telephone>", "email": "<email>", "decider": true }
```

**Échange** — clé `exchanges/<id>`
```json
{ "id": "<id>", "companyId": "<id de l'entreprise>", "kind": "Mail",
  "date": "<date du jour>", "time": "", "people": [],
  "text": "Demande de devis depuis le site (<page>).\nActivité : <activite>\nBriques : <briques>\nCalculette : <configuration>\nÀ rappeler : <rappel>\nMessage : <message>" }
```

Valeurs possibles, pour mémoire : types `Magasin`, `Réseau`, `Installateur`, `Fabricant` ;
types d'échange `Visite`, `Appel`, `Mail`, `Démo`, `Salon`, `Autre`.

Doublons : le formulaire ne demande pas la ville, donc l'app ne peut pas repérer seule un
doublon (elle compare nom + ville). Option : chercher d'abord une entreprise au même nom
dans `stagnum_kv` (clé `companies/%`) et, si elle existe, ajouter seulement le contact et l'échange.

## 4. Les deux e-mails

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
