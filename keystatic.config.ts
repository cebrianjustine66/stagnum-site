// Interface d'édition du site (/keystatic).
// Chaque champ décrit ici correspond à un fichier de src/content/.
import { config, collection, singleton, fields } from '@keystatic/core';

// Sur l'ordinateur (npm run dev), les modifications sont écrites dans les fichiers du dossier.
// En ligne, elles sont envoyées dans le dépôt GitHub : il faut s'y connecter pour modifier.
const online = !import.meta.env.DEV || import.meta.env.PUBLIC_KEYSTATIC_MODE === 'github';

const ICONS = [
  { label: 'Devis', value: 'devis' },
  { label: 'Factures', value: 'factures' },
  { label: 'Chantiers', value: 'chantiers' },
  { label: 'Achats', value: 'achats' },
  { label: 'Caisse', value: 'caisse' },
  { label: 'Inventaire', value: 'inventaire' },
  { label: 'Analyse d’eau', value: 'eau' },
  { label: 'Équipe', value: 'equipe' },
  { label: 'Nuage', value: 'nuage' },
  { label: 'Réglages', value: 'reglages' },
  { label: 'Métier (piscine)', value: 'metier' },
  { label: 'Horloge', value: 'horloge' },
  { label: 'Voix', value: 'voix' },
  { label: 'Magasin', value: 'magasin' },
  { label: 'Camion', value: 'camion' },
  { label: 'Coche', value: 'check' },
];

const COLORS = [
  { label: 'Bleu d’eau clair', value: '#DDF2F3' },
  { label: 'Vert d’eau', value: '#E1F3F1' },
  { label: 'Bleu gris', value: '#D6E8E9' },
  { label: 'Sable', value: '#F3EDE2' },
  { label: 'Pêche', value: '#FBE6D2' },
  { label: 'Corail clair', value: '#F8DDD0' },
];

const RICH =
  'Entourez un passage d’astérisques pour le surligner : *comme ceci*. Un lien s’écrit [texte du lien](/adresse/).';
const VARS =
  'Variables remplacées automatiquement : {essai} = nombre de jours d’essai, {nb_briques} = nombre de briques en chiffres, {toutes} = nombre de briques en lettres.';

const seo = () =>
  fields.object(
    {
      title: fields.text({ label: 'Titre pour Google', description: 'Environ 60 caractères. S’affiche dans l’onglet du navigateur et dans les résultats de recherche.' }),
      description: fields.text({ label: 'Description pour Google', description: 'Environ 150 caractères.', multiline: true }),
    },
    { label: 'Référencement' },
  );

const faq = (label = 'Questions fréquentes') =>
  fields.array(
    fields.object({
      q: fields.text({ label: 'Question' }),
      a: fields.text({ label: 'Réponse', multiline: true }),
    }),
    { label, itemLabel: (p) => p.fields.q.value || 'Nouvelle question' },
  );

const list = (label: string, description?: string) =>
  fields.array(fields.text({ label: 'Ligne' }), { label, description, itemLabel: (p) => p.value || 'Nouvelle ligne' });

// Blocs réutilisables : on peut en empiler autant qu'on veut en bas d'une page.
const blocks = () =>
  fields.blocks(
    {
      texte: {
        label: 'Texte',
        itemLabel: (p) => `Texte : ${p.fields.title.value}`,
        schema: fields.object({
          title: fields.text({ label: 'Titre', description: RICH }),
          text: fields.text({ label: 'Texte', description: 'Une ligne vide sépare deux paragraphes. ' + RICH, multiline: true }),
          background: fields.select({
            label: 'Fond',
            options: [
              { label: 'Clair', value: 'clair' },
              { label: 'Sable', value: 'sable' },
              { label: 'Turquoise foncé', value: 'fonce' },
            ],
            defaultValue: 'clair',
          }),
        }),
      },
      liste: {
        label: 'Liste à puces',
        itemLabel: (p) => `Liste : ${p.fields.title.value}`,
        schema: fields.object({
          title: fields.text({ label: 'Titre', description: RICH }),
          intro: fields.text({ label: 'Phrase d’introduction (facultatif)', multiline: true }),
          items: list('Points de la liste', RICH),
          background: fields.select({
            label: 'Fond',
            options: [
              { label: 'Clair', value: 'clair' },
              { label: 'Sable', value: 'sable' },
              { label: 'Turquoise foncé', value: 'fonce' },
            ],
            defaultValue: 'clair',
          }),
        }),
      },
      cartes: {
        label: 'Cartes',
        itemLabel: (p) => `Cartes : ${p.fields.title.value}`,
        schema: fields.object({
          title: fields.text({ label: 'Titre au-dessus des cartes (facultatif)', description: RICH }),
          cards: fields.array(
            fields.object({
              icon: fields.select({ label: 'Icône', options: ICONS, defaultValue: 'check' }),
              title: fields.text({ label: 'Titre de la carte' }),
              text: fields.text({ label: 'Texte', multiline: true }),
              href: fields.text({ label: 'Lien (facultatif)', description: 'Exemple : /tarifs/. Laissez vide pour une carte non cliquable.' }),
            }),
            { label: 'Cartes', itemLabel: (p) => p.fields.title.value || 'Nouvelle carte' },
          ),
        }),
      },
      cta: {
        label: 'Appel à l’action',
        itemLabel: (p) => `Appel à l’action : ${p.fields.title.value}`,
        schema: fields.object({
          title: fields.text({
            label: 'Titre',
            description: 'Le bandeau turquoise avec les boutons « Calculer mon tarif » et « Demander un devis ».',
            defaultValue: 'Voyez ce que Stagnum coûterait pour votre magasin',
          }),
        }),
      },
      faq: {
        label: 'Questions fréquentes',
        itemLabel: (p) => `Questions : ${p.fields.title.value}`,
        schema: fields.object({
          title: fields.text({ label: 'Titre', defaultValue: 'Questions fréquentes' }),
          items: faq('Questions'),
        }),
      },
    },
    { label: 'Blocs supplémentaires', description: 'S’ajoutent en bas de la page, dans l’ordre choisi. Glissez-les pour les réordonner.' },
  );

export default config({
  storage: online ? { kind: 'github', repo: 'cebrianjustine66/stagnum-site' } : { kind: 'local' },
  locale: 'fr-FR',
  ui: {
    brand: { name: 'Stagnum · contenu du site' },
    navigation: {
      Blog: ['posts'],
      Pages: ['accueil', 'tarifs', 'pages'],
    },
  },
  collections: {
    posts: collection({
      label: 'Articles de blog',
      path: 'src/content/blog/*',
      slugField: 'h1',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['h1', 'date'],
      schema: {
        h1: fields.slug({
          name: { label: 'Titre de l’article', validation: { isRequired: true } },
          slug: { label: 'Adresse de l’article', description: 'Ce qui suit stagnum.fr/blog/. Évitez de la changer après publication.' },
        }),
        title: fields.text({ label: 'Titre pour Google', description: 'Environ 60 caractères, terminé par « | Stagnum ».', validation: { isRequired: true } }),
        description: fields.text({ label: 'Résumé', description: 'Environ 150 caractères. Sert de chapeau, d’extrait dans la liste du blog et de description pour Google.', multiline: true, validation: { isRequired: true } }),
        date: fields.date({ label: 'Date de publication', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        updated: fields.date({ label: 'Date de mise à jour (facultatif)' }),
        tag: fields.text({ label: 'Thème', description: 'Un seul mot : Factures, Chantiers, Magasin…', validation: { isRequired: true } }),
        minutes: fields.integer({ label: 'Temps de lecture (minutes)', defaultValue: 4, validation: { isRequired: true, min: 1 } }),
        icon: fields.select({ label: 'Icône', options: ICONS, defaultValue: 'devis' }),
        color: fields.select({ label: 'Couleur de l’icône', options: COLORS, defaultValue: '#DDF2F3' }),
        content: fields.mdx({
          label: 'Texte de l’article',
          description: 'Le dernier titre de niveau 2 et la liste qui le suit forment l’encadré « À retenir ».',
          extension: 'md',
          options: { image: false, heading: [2, 3], codeBlock: false, code: false, divider: false },
        }),
      },
    }),
    pages: collection({
      label: 'Pages de fonctionnalités',
      path: 'src/content/pages/*',
      slugField: 'nav',
      format: { data: 'json' },
      columns: ['nav', 'kind'],
      schema: {
        nav: fields.slug({
          name: { label: 'Nom dans le menu', validation: { isRequired: true } },
          slug: { label: 'Adresse de la page', description: 'Ce qui suit stagnum.fr/. Évitez de la changer après publication.' },
        }),
        order: fields.integer({ label: 'Position dans le menu', description: 'Les pages sont rangées du plus petit au plus grand.', defaultValue: 99 }),
        kind: fields.select({
          label: 'Type de page',
          options: [
            { label: 'Brique (vendue séparément)', value: 'brique' },
            { label: 'Atout (inclus dans les briques)', value: 'atout' },
          ],
          defaultValue: 'atout',
        }),
        brick: fields.select({
          label: 'Démonstration affichée en haut de page',
          description: 'Pour une page « brique » : la brique correspondante.',
          options: [
            { label: 'Aucune', value: 'aucune' },
            { label: 'Devis', value: 'devis' },
            { label: 'Factures', value: 'factures' },
            { label: 'Chantiers', value: 'chantiers' },
            { label: 'Achats', value: 'achats' },
            { label: 'Caisse', value: 'caisse' },
            { label: 'Inventaire', value: 'inventaire' },
            { label: 'Analyse d’eau', value: 'eau' },
          ],
          defaultValue: 'aucune',
        }),
        included: fields.text({ label: 'Mention « inclus avec » (atouts)', description: 'Exemple : Incluse avec la brique Factures. Le site ajoute « , sans supplément ».' }),
        withBricks: fields.text({ label: 'Mention courte dans le menu (atouts)', description: 'Exemple : Avec la brique Factures.' }),
        parent: fields.relationship({ label: 'Brique dont l’atout fait partie (facultatif)', collection: 'pages' }),
        title: fields.text({ label: 'Titre pour Google', description: 'Environ 60 caractères, terminé par « | Stagnum ».', validation: { isRequired: true } }),
        description: fields.text({ label: 'Description pour Google', description: 'Environ 150 caractères.', multiline: true, validation: { isRequired: true } }),
        h1: fields.text({ label: 'Grand titre de la page', validation: { isRequired: true } }),
        lead: fields.text({ label: 'Texte d’introduction', multiline: true }),
        voice: fields.object(
          {
            said: fields.text({ label: 'Phrase dictée', description: 'Avec les guillemets « ».', multiline: true }),
            done: list('Ce que fait Stagnum'),
          },
          { label: 'Exemple à la voix', description: 'Affiché en haut de page quand aucune démonstration n’est choisie.' },
        ),
        points: list('Ce qu’il fait pour vous', 'La liste à coches de l’encadré turquoise.'),
        sections: fields.array(
          fields.object({
            h2: fields.text({ label: 'Titre' }),
            text: fields.text({ label: 'Texte', multiline: true }),
          }),
          { label: 'Étapes numérotées', itemLabel: (p) => p.fields.h2.value || 'Nouvelle étape' },
        ),
        faq: faq(),
        related: fields.array(fields.relationship({ label: 'Page', collection: 'pages' }), {
          label: 'Pages liées',
          itemLabel: (p) => p.value ?? 'Page',
        }),
        blocks: blocks(),
      },
    }),
  },
  singletons: {
    accueil: singleton({
      label: 'Page d’accueil',
      path: 'src/content/accueil',
      format: { data: 'json' },
      schema: {
        seo: seo(),
        hero: fields.object(
          {
            title: fields.text({ label: 'Grand titre', description: RICH }),
            lead: fields.text({ label: 'Texte d’introduction', multiline: true }),
            proofs: list('Arguments sous les boutons', VARS),
          },
          { label: 'Haut de page' },
        ),
        bricks: fields.object(
          {
            title: fields.text({ label: 'Titre', description: `${RICH} ${VARS}` }),
            lead: fields.text({ label: 'Texte', multiline: true }),
          },
          { label: 'Section « Les briques »', description: 'Le nom et la phrase de chaque brique se règlent avec les prix.' },
        ),
        smart: fields.object(
          {
            title: fields.text({ label: 'Titre', description: RICH }),
            lead: fields.text({ label: 'Texte', multiline: true }),
            points: list('Liste à coches', RICH),
            flows: fields.array(
              fields.object({
                icon: fields.select({ label: 'Icône', options: ICONS, defaultValue: 'devis' }),
                you: fields.text({ label: 'Ce que vous faites' }),
                it: fields.text({ label: 'Ce que fait Stagnum' }),
              }),
              { label: 'Exemples', itemLabel: (p) => p.fields.you.value || 'Nouvel exemple' },
            ),
          },
          { label: 'Section « Il fait la saisie »' },
        ),
        perso: fields.object(
          {
            title: fields.text({ label: 'Titre', description: RICH }),
            lead: fields.text({ label: 'Texte', multiline: true }),
            points: list('Liste à coches', RICH),
            button: fields.text({ label: 'Texte du bouton' }),
          },
          { label: 'Section « Réglé à votre façon »' },
        ),
        price: fields.object(
          {
            title: fields.text({ label: 'Titre', description: RICH }),
            lead: fields.text({ label: 'Texte', multiline: true }),
            steps: list('Les trois étapes'),
            bonus: fields.text({ label: 'Phrase sur le prix préférentiel', description: `Deux astérisques mettent en gras : **comme ceci**. ${VARS}` }),
            note: fields.text({ label: 'Note sous l’encadré', description: RICH }),
          },
          { label: 'Section « Un prix par magasin »' },
        ),
        faq: faq(),
        blocks: blocks(),
      },
    }),
    tarifs: singleton({
      label: 'Page des tarifs',
      path: 'src/content/tarifs',
      format: { data: 'json' },
      schema: {
        seo: seo(),
        hero: fields.object(
          {
            title: fields.text({ label: 'Grand titre', description: RICH }),
            lead: fields.text({ label: 'Texte d’introduction', multiline: true }),
          },
          { label: 'Haut de page' },
        ),
        steps: fields.object(
          {
            team: fields.text({ label: 'Question 1 (taille de l’équipe)' }),
            bricks: fields.text({ label: 'Question 2 (briques)' }),
            duration: fields.text({ label: 'Question 3 (durée)' }),
            payment: fields.text({ label: 'Question 4 (paiement)' }),
          },
          { label: 'Questions de la calculette', description: 'Les prix eux-mêmes ne se règlent pas ici.' },
        ),
        included: fields.object(
          {
            title: fields.text({ label: 'Titre', description: RICH }),
            items: fields.array(
              fields.object({
                icon: fields.select({ label: 'Icône', options: ICONS, defaultValue: 'check' }),
                title: fields.text({ label: 'Titre', description: VARS }),
                text: fields.text({ label: 'Texte' }),
                color: fields.select({ label: 'Couleur de l’icône', options: COLORS, defaultValue: '#E1F3F1' }),
              }),
              { label: 'Éléments', itemLabel: (p) => p.fields.title.value || 'Nouvel élément' },
            ),
          },
          { label: 'Section « Toujours inclus »' },
        ),
        request: fields.object(
          {
            title: fields.text({ label: 'Titre' }),
            lead: fields.text({ label: 'Texte', description: VARS, multiline: true }),
          },
          { label: 'Section « Demande de devis »' },
        ),
        faqTitle: fields.text({ label: 'Titre des questions fréquentes' }),
        faq: faq(),
        blocks: blocks(),
      },
    }),
  },
});
