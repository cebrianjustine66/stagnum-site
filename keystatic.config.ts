// Interface d'édition du site (/keystatic).
// Chaque rubrique décrite ici correspond à un fichier de src/content/.
// L'habillage (couleurs, polices) est dans src/editor/.
import { createElement } from 'react';
import { config, collection, singleton, fields } from '@keystatic/core';
import logo from './src/assets/logo-mark.png';

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

const BACKGROUNDS = [
  { label: 'Clair', value: 'clair' },
  { label: 'Sable', value: 'sable' },
  { label: 'Turquoise foncé', value: 'fonce' },
];

const HL = 'Pour surligner un passage, entourez-le d’astérisques : *comme ceci*.';
const LINK = 'Un lien s’écrit [texte du lien](/adresse/).';
const TRIAL = '{essai} est remplacé par le nombre de jours d’essai.';
const COUNT = '{nb_briques} et {toutes} sont remplacés par le nombre de briques, en chiffres et en lettres.';

// Champ texte qui retient s'il tient sur plusieurs lignes : l'éditeur visuel (src/edition/) en a besoin.
const textField: typeof fields.text = (opts: any) => Object.assign(fields.text(opts), { multiline: !!opts?.multiline }) as any;

// Raccourcis : une ligne de texte, un texte long, une icône, une couleur.
const text = (label: string, description?: string) => textField({ label, description });
const long = (label: string, description?: string) => textField({ label, description, multiline: true });
const icon = (defaultValue = 'check') => fields.select({ label: 'Icône', options: ICONS, defaultValue });
const color = (defaultValue = '#E1F3F1') => fields.select({ label: 'Couleur de l’icône', options: COLORS, defaultValue });
const group = <T extends Parameters<typeof fields.object>[0]>(label: string, schema: T, description?: string) =>
  fields.object(schema, { label, description });

const seo = () =>
  group(
    'Référencement (Google)',
    {
      title: text('Titre pour Google', 'Environ 60 caractères. C’est aussi le titre de l’onglet du navigateur.'),
      description: long('Description pour Google', 'Environ 150 caractères. C’est le texte gris sous le titre dans les résultats de recherche.'),
    },
    'Ce que Google affiche pour cette page. Sans effet sur ce qu’on voit dans la page elle-même.',
  );

const faq = (label = 'Questions fréquentes') =>
  fields.array(
    fields.object({
      q: text('Question'),
      a: long('Réponse'),
    }),
    { label, itemLabel: (p) => p.fields.q.value || 'Nouvelle question' },
  );

const list = (label: string, description?: string) =>
  fields.array(textField({ label: 'Ligne' }), { label, description, itemLabel: (p) => p.value || 'Nouvelle ligne' });

const links = (label: string, description?: string) =>
  fields.array(
    fields.object({
      label: text('Texte du lien'),
      href: text('Adresse', 'Exemple : /tarifs/'),
    }),
    { label, description, itemLabel: (p) => `${p.fields.label.value || 'Nouveau lien'}  →  ${p.fields.href.value}` },
  );

// Blocs réutilisables : on peut en empiler autant qu'on veut en bas d'une page.
const blocks = () =>
  fields.blocks(
    {
      texte: {
        label: 'Texte : un titre et des paragraphes',
        itemLabel: (p) => `Texte · ${p.fields.title.value}`,
        schema: fields.object({
          title: textField({ label: 'Titre', description: HL, defaultValue: 'Votre titre' }),
          text: textField({ label: 'Texte', description: `Laissez une ligne vide entre deux paragraphes. ${LINK}`, multiline: true }),
          background: fields.select({ label: 'Couleur de fond', options: BACKGROUNDS, defaultValue: 'clair' }),
        }),
      },
      liste: {
        label: 'Liste à coches',
        itemLabel: (p) => `Liste · ${p.fields.title.value}`,
        schema: fields.object({
          title: textField({ label: 'Titre', description: HL, defaultValue: 'Votre titre' }),
          intro: long('Phrase d’introduction (facultatif)'),
          items: list('Points de la liste', LINK),
          background: fields.select({ label: 'Couleur de fond', options: BACKGROUNDS, defaultValue: 'sable' }),
        }),
      },
      cartes: {
        label: 'Cartes : une rangée d’encadrés avec icône',
        itemLabel: (p) => `Cartes · ${p.fields.title.value || `${p.fields.cards.elements.length} carte(s)`}`,
        schema: fields.object({
          title: text('Titre au-dessus des cartes (facultatif)', HL),
          cards: fields.array(
            fields.object({
              icon: icon(),
              title: text('Titre de la carte'),
              text: long('Texte'),
              href: text('Lien (facultatif)', 'Exemple : /tarifs/. Laissez vide pour une carte non cliquable.'),
            }),
            { label: 'Cartes', description: 'Trois cartes tiennent sur une ligne.', itemLabel: (p) => p.fields.title.value || 'Nouvelle carte' },
          ),
        }),
      },
      etapes: {
        label: 'Étapes numérotées : des ronds reliés par une ligne',
        itemLabel: (p) => `Étapes · ${p.fields.title.value}`,
        schema: fields.object({
          title: textField({ label: 'Titre', description: HL, defaultValue: 'Votre titre' }),
          steps: fields.array(
            fields.object({
              title: text('Titre de l’étape', 'Le numéro s’ajoute tout seul.'),
              text: long('Texte', LINK),
            }),
            { label: 'Étapes', description: 'Trois étapes tiennent bien sur une ligne.', itemLabel: (p) => p.fields.title.value || 'Nouvelle étape' },
          ),
        }),
      },
      equipe: {
        label: 'Équipe : un texte et les cartes des membres, qui se retournent au clic',
        itemLabel: (p) => `Équipe · ${p.fields.title.value}`,
        schema: fields.object({
          title: textField({ label: 'Titre', description: HL, defaultValue: 'Qui est *derrière Stagnum* ?' }),
          text: textField({ label: 'Texte', description: `Les membres, leurs photos et leurs présentations se règlent dans « Qui sommes-nous ». ${LINK}`, multiline: true }),
          button: text('Texte du bouton (facultatif)'),
          href: text('Adresse du bouton', 'Exemple : /a-propos/'),
        }),
      },
      cta: {
        label: 'Appel à l’action : bandeau avec les deux boutons',
        itemLabel: (p) => `Appel à l’action · ${p.fields.title.value}`,
        schema: fields.object({
          title: textField({
            label: 'Titre',
            description: 'Le bandeau turquoise avec les boutons « Calculer mon tarif » et « Demander un devis ».',
            defaultValue: 'Voyez ce que Stagnum coûterait pour votre magasin',
          }),
        }),
      },
      faq: {
        label: 'Questions fréquentes',
        itemLabel: (p) => `Questions · ${p.fields.title.value}`,
        schema: fields.object({
          title: textField({ label: 'Titre', defaultValue: 'Questions fréquentes' }),
          items: faq('Questions'),
        }),
      },
    },
    {
      label: 'Blocs supplémentaires',
      description: 'Des sections en plus, affichées en bas de la page dans l’ordre choisi. Cliquez sur « Ajouter » pour en ajouter une, glissez-les pour les réordonner.',
    },
  );

const prices = (label: string) =>
  group(label, {
    solo: fields.integer({ label: 'Indépendant (seul)', validation: { isRequired: true, min: 0 } }),
    s: fields.integer({ label: 'Équipe de 2 à 5', validation: { isRequired: true, min: 0 } }),
    m: fields.integer({ label: 'Équipe de 6 à 10', validation: { isRequired: true, min: 0 } }),
    l: fields.integer({ label: 'Équipe de 11 à 20', validation: { isRequired: true, min: 0 } }),
  });

const brick = (name: string) =>
  group(`Brique ${name}`, {
    name: text('Nom affiché'),
    desc: text('Phrase courte', 'Affichée sur l’accueil, dans le menu et dans la calculette.'),
    prices: prices('Prix en € HT par mois et par magasin'),
    href: text('Page de la brique', 'Adresse de sa page de fonctionnalité, par exemple /logiciel-devis-piscine/.'),
  });

const tier = (label: string) =>
  group(label, {
    label: text('Intitulé'),
    sub: text('Précision en dessous'),
  });

const legalSections = () =>
  fields.array(
    fields.object({
      title: text('Titre du paragraphe'),
      text: long(
        'Texte',
        'Une ligne vide sépare deux paragraphes. Les informations de l’éditeur s’insèrent toutes seules : {raison_sociale}, {forme_juridique}, {capital}, {siege}, {rcs}, {siren}, {tva}, {email}, {telephone}, {directeur}, {hebergeur_nom}, {hebergeur_adresse}, {hebergeur_telephone}.',
      ),
    }),
    { label: 'Paragraphes', itemLabel: (p) => p.fields.title.value || 'Nouveau paragraphe' },
  );

export default config({
  storage: online ? { kind: 'github', repo: 'cebrianjustine66/stagnum-site' } : { kind: 'local' },
  locale: 'fr-FR',
  ui: {
    brand: {
      name: 'Stagnum',
      mark: () => createElement('img', { src: logo.src, alt: '', width: 28, height: 28, style: { borderRadius: 8 } }),
    },
    navigation: {
      'Pages du site': ['accueil', 'tarifs', 'pages', 'comparatif', 'apropos', 'demande', 'messages'],
      Blog: ['posts', 'pageBlog'],
      Prix: ['prix'],
      'Présent sur toutes les pages': ['navigation', 'commun', 'formulaire'],
      Réglages: ['site', 'legal'],
    },
  },
  collections: {
    posts: collection({
      label: 'Articles',
      path: 'src/content/blog/*',
      slugField: 'h1',
      format: { contentField: 'content' },
      entryLayout: 'content',
      previewUrl: '/blog/{slug}/',
      columns: ['h1', 'tag', 'date'],
      schema: {
        h1: fields.slug({
          name: { label: 'Titre de l’article', validation: { isRequired: true } },
          slug: { label: 'Adresse de l’article', description: 'Remplie toute seule à partir du titre. Évitez de la changer après publication.' },
        }),
        description: textField({
          label: 'Résumé',
          description: 'Une ou deux phrases, environ 150 caractères. Affiché sous le titre, dans la liste du blog et dans Google.',
          multiline: true,
          validation: { isRequired: true },
        }),
        tag: textField({ label: 'Thème', description: 'Un seul mot : Factures, Chantiers, Magasin, Devis…', defaultValue: 'Gestion', validation: { isRequired: true } }),
        date: fields.date({ label: 'Date de publication', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        minutes: fields.integer({ label: 'Temps de lecture (minutes)', defaultValue: 4, validation: { isRequired: true, min: 1 } }),
        icon: fields.select({ label: 'Icône', description: 'Affichée dans « À lire aussi ».', options: ICONS, defaultValue: 'devis' }),
        color: color('#DDF2F3'),
        title: text('Titre pour Google (facultatif)', 'Laissez vide pour reprendre le titre de l’article suivi de « | Stagnum ».'),
        updated: fields.date({ label: 'Date de mise à jour (facultatif)' }),
        content: fields.mdx({
          label: 'Texte de l’article',
          description: 'Le dernier titre et la liste qui le suit forment l’encadré « À retenir ».',
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
      previewUrl: '/{slug}/',
      columns: ['nav', 'kind'],
      schema: {
        nav: fields.slug({
          name: { label: 'Nom de la page', description: 'Tel qu’il apparaît dans le menu.', validation: { isRequired: true } },
          slug: { label: 'Adresse de la page', description: 'Ce qui suit stagnum.fr/. Évitez de la changer après publication.' },
        }),
        kind: fields.select({
          label: 'Type de page',
          description: 'Une brique se vend séparément. Un atout est inclus dans les briques (colonne « Inclus » du menu).',
          options: [
            { label: 'Brique', value: 'brique' },
            { label: 'Atout', value: 'atout' },
          ],
          defaultValue: 'atout',
        }),
        brick: fields.select({
          label: 'Démonstration animée en haut de page',
          description: 'Pour une brique, choisissez la sienne. Avec « Aucune », c’est l’exemple à la voix ci-dessous qui s’affiche.',
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
        h1: textField({ label: 'Grand titre', validation: { isRequired: true } }),
        lead: long('Texte d’introduction'),
        voice: group(
          'Exemple à la voix',
          {
            said: long('Phrase dictée', 'Avec les guillemets « ».'),
            done: list('Ce que fait Stagnum'),
          },
          'L’encadré « Vous dites », affiché en haut de page quand aucune démonstration n’est choisie.',
        ),
        included: text('Pastille sous les boutons (atouts)', 'Exemple : Incluse avec la brique Factures. Le site ajoute « , sans supplément ».'),
        points: list('Liste « Ce qu’il fait pour vous »', 'Les coches de l’encadré turquoise.'),
        sections: fields.array(
          fields.object({
            h2: text('Titre'),
            text: long('Texte'),
          }),
          { label: 'Étapes numérotées', description: 'Les encadrés 1, 2, 3 à droite de la liste.', itemLabel: (p) => p.fields.h2.value || 'Nouvelle étape' },
        ),
        faq: faq(),
        blocks: blocks(),
        order: fields.integer({ label: 'Position dans le menu', description: 'Les pages sont rangées du plus petit au plus grand nombre.', defaultValue: 99 }),
        withBricks: text('Précision dans le menu (atouts)', 'Exemple : Avec la brique Factures.'),
        title: textField({ label: 'Titre pour Google', description: 'Environ 60 caractères, terminé par « | Stagnum ».', validation: { isRequired: true } }),
        description: textField({ label: 'Description pour Google', description: 'Environ 150 caractères.', multiline: true, validation: { isRequired: true } }),
      },
    }),
  },
  singletons: {
    accueil: singleton({
      label: 'Accueil',
      path: 'src/content/accueil',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        hero: group('1. Haut de page', {
          title: text('Grand titre', HL),
          lead: long('Texte d’introduction'),
          proofs: list('Arguments sous les boutons', TRIAL),
        }),
        bricks: group(
          '2. Les briques',
          {
            title: text('Titre', `${HL} ${COUNT}`),
            lead: long('Texte'),
            more: text('Lien en bas de chaque carte'),
          },
          'Le nom et la phrase de chaque brique se règlent dans « Prix et briques ».',
        ),
        smart: group('3. Il fait la saisie, vous décidez', {
          title: text('Titre', HL),
          lead: long('Texte'),
          points: list('Liste à coches', LINK),
          flows: fields.array(
            fields.object({
              icon: icon('devis'),
              you: text('Ce que vous faites'),
              it: text('Ce que fait Stagnum'),
            }),
            { label: 'Exemples (colonne de droite)', itemLabel: (p) => p.fields.you.value || 'Nouvel exemple' },
          ),
        }),
        perso: group(
          '4. Réglé à votre façon',
          {
            title: text('Titre', HL),
            lead: long('Texte'),
            points: list('Liste à coches', LINK),
            button: text('Texte du bouton'),
          },
          'La fenêtre de réglages animée à droite ne se modifie pas ici.',
        ),
        price: group('5. Un prix par magasin', {
          title: text('Titre', HL),
          lead: long('Texte'),
          steps: list('Les trois étapes'),
          bonus: text('Phrase sur le prix préférentiel', `Deux astérisques mettent en gras : **comme ceci**. ${COUNT}`),
          note: text('Note sous l’encadré', LINK),
          allChip: text('Pastille « toutes les briques »', COUNT),
        }),
        faq: faq('6. Questions fréquentes'),
        blocks: blocks(),
        seo: seo(),
      },
    }),
    tarifs: singleton({
      label: 'Tarifs (textes)',
      path: 'src/content/tarifs',
      format: { data: 'json' },
      previewUrl: '/tarifs/',
      schema: {
        breadcrumb: text('Nom de la page', 'Utilisé dans le fil d’Ariane envoyé à Google.'),
        hero: group('1. Haut de page', {
          title: text('Grand titre', HL),
          lead: long('Texte d’introduction'),
        }),
        steps: group(
          '2. Les quatre questions de la calculette',
          {
            team: text('Question 1 (taille de l’équipe)'),
            bricks: text('Question 2 (briques)'),
            duration: text('Question 3 (durée)'),
            payment: text('Question 4 (paiement)'),
          },
          'Les prix eux-mêmes se règlent dans « Prix et briques ».',
        ),
        calc: group('3. Textes des choix de la calculette', {
          xlLabel: text('Grande équipe : intitulé'),
          xlSub: text('Grande équipe : précision'),
          storesLabel: text('Nombre de magasins : question'),
          storesHint: text('Nombre de magasins : aide'),
          allTitle: text('Toutes les briques : titre', COUNT),
          allHint: text('Toutes les briques : aide'),
          allButton: text('Toutes les briques : bouton'),
          reduced: text('Durée : mention pour un prix réduit'),
          minimum: text('Durée : mention pour l’engagement minimum'),
          engagementHint: text('Durée : aide sous les choix', TRIAL),
          monthlyTitle: text('Paiement mensuel : titre'),
          monthlySub: text('Paiement mensuel : précision'),
          yearlyBadge: text('Paiement annuel : pastille', '{remise_annuelle} est remplacé par la remise réglée dans « Prix et briques ».'),
          yearlyTitle: text('Paiement annuel : titre'),
          yearlySub: text('Paiement annuel : précision', '{remise_annuelle} est remplacé par la remise réglée dans « Prix et briques ».'),
        }),
        summary: group(
          '4. Encadré « Votre prix »',
          {
            title: text('Titre'),
            empty: text('Message tant qu’aucune brique n’est cochée'),
            unit: text('Unité sous le montant'),
            perStore: text('Complément avec plusieurs magasins', 'Commence par un espace.'),
            quote: text('Message pour plus de 20 personnes'),
            button: text('Bouton'),
            trial: text('Mention sous le bouton', TRIAL),
          },
          'Les phrases calculées (économie, total pour plusieurs magasins…) ne se modifient pas ici.',
        ),
        included: group('5. Toujours inclus', {
          title: text('Titre', HL),
          items: fields.array(
            fields.object({
              icon: icon(),
              title: text('Titre', TRIAL),
              text: text('Texte'),
              color: color(),
            }),
            { label: 'Éléments', itemLabel: (p) => p.fields.title.value || 'Nouvel élément' },
          ),
        }),
        examples: group(
          '6. Exemples de prix',
          {
            title: text('Titre', HL),
            items: fields.array(
              fields.object({
                title: text('Profil', 'Exemple : Magasin de 4 personnes.'),
                text: text('Phrase de description'),
                tier: fields.select({
                  label: 'Taille de l’équipe',
                  options: [
                    { label: 'Indépendant', value: 'solo' },
                    { label: '2 à 5 personnes', value: 's' },
                    { label: '6 à 10 personnes', value: 'm' },
                    { label: '11 à 20 personnes', value: 'l' },
                  ],
                  defaultValue: 's',
                }),
                bricks: fields.multiselect({
                  label: 'Briques comptées dans l’exemple',
                  options: [
                    { label: 'Devis', value: 'devis' },
                    { label: 'Factures', value: 'factures' },
                    { label: 'Chantiers', value: 'chantiers' },
                    { label: 'Achats', value: 'achats' },
                    { label: 'Caisse', value: 'caisse' },
                    { label: 'Inventaire', value: 'inventaire' },
                    { label: 'Analyse d’eau', value: 'eau' },
                  ],
                }),
              }),
              { label: 'Exemples', description: 'Trois exemples tiennent sur une ligne. Supprimez-les tous pour masquer la section.', itemLabel: (p) => p.fields.title.value || 'Nouvel exemple' },
            ),
            note: long('Mention sous les exemples', TRIAL),
          },
          'Le montant n’est pas à saisir : il est calculé avec les prix de « Prix et briques » et suit leurs changements.',
        ),
        request: group('7. Demande de devis', {
          title: text('Titre'),
          lead: long('Texte', TRIAL),
        }),
        faqTitle: text('8. Titre des questions fréquentes'),
        faq: faq('Questions fréquentes'),
        blocks: blocks(),
        seo: seo(),
      },
    }),
    comparatif: singleton({
      label: 'Comparatif Extrabat',
      path: 'src/content/comparatif',
      format: { data: 'json' },
      previewUrl: '/alternative-extrabat/',
      schema: {
        breadcrumb: text('Nom de la page', 'Utilisé dans le fil d’Ariane envoyé à Google.'),
        hero: group('1. Haut de page', {
          crumb: text('Fil d’Ariane affiché'),
          title: text('Grand titre', HL),
          lead: long('Texte d’introduction'),
        }),
        table: group('2. Tableau comparatif', {
          title: text('Titre', HL),
          us: text('En-tête de la colonne Stagnum'),
          them: text('En-tête de l’autre colonne'),
          rows: fields.array(
            fields.object({
              icon: icon(),
              label: text('Critère'),
              us: text('Stagnum', TRIAL),
              them: text('Extrabat'),
            }),
            { label: 'Lignes du tableau', itemLabel: (p) => p.fields.label.value || 'Nouvelle ligne' },
          ),
          source: long('Mention sous le tableau', '{date} est remplacé par la date du relevé ci-dessous.'),
          checked: text('Date du relevé des informations', 'Exemple : 11 octobre 2026. À mettre à jour quand vous revérifiez les informations d’Extrabat.'),
        }),
        forUs: group('3. Stagnum est fait pour vous si…', {
          title: text('Titre', 'Entre astérisques : le passage en orange.'),
          intro: text('Phrase sous le titre'),
          items: fields.array(
            fields.object({
              icon: icon(),
              color: color(),
              title: text('Titre'),
              text: long('Texte'),
            }),
            { label: 'Situations', itemLabel: (p) => p.fields.title.value || 'Nouvelle situation' },
          ),
        }),
        forThem: group('4. Extrabat reste un bon choix si…', {
          title: text('Titre', 'Entre astérisques : le passage en orange.'),
          intro: text('Phrase sous le titre'),
          items: fields.array(
            fields.object({
              title: text('Début en gras'),
              text: text('Suite de la phrase'),
            }),
            { label: 'Situations', itemLabel: (p) => p.fields.title.value || 'Nouvelle situation' },
          ),
        }),
        test: group('5. Le test en une heure', {
          title: text('Titre', HL),
          steps: fields.array(
            fields.object({
              title: text('Titre'),
              text: text('Texte'),
            }),
            { label: 'Étapes', itemLabel: (p) => p.fields.title.value || 'Nouvelle étape' },
          ),
          button: text('Bouton', TRIAL),
        }),
        faq: faq('6. Questions fréquentes'),
        ctaTitle: text('7. Titre du bandeau final'),
        blocks: blocks(),
        seo: seo(),
      },
    }),
    apropos: singleton({
      label: 'Qui sommes-nous',
      path: 'src/content/a-propos',
      format: { data: 'json' },
      previewUrl: '/a-propos/',
      schema: {
        breadcrumb: text('Nom de la page', 'Utilisé dans le fil d’Ariane envoyé à Google.'),
        hero: group('1. Haut de page', {
          title: text('Grand titre', HL),
          lead: long('Texte d’introduction'),
        }),
        story: group('2. Pourquoi Stagnum', {
          title: text('Titre de l’encadré foncé', HL),
          points: list('Points à coches de l’encadré'),
          button: text('Bouton de l’encadré (facultatif)'),
          href: text('Adresse du bouton', 'Exemple : /demande-de-devis/'),
          items: fields.array(
            fields.object({
              title: text('Titre'),
              text: long('Texte'),
            }),
            { label: 'Étapes de l’histoire', description: 'Numérotées toutes seules, dans l’ordre.', itemLabel: (p) => p.fields.title.value || 'Nouvelle étape' },
          ),
        }),
        team: group('3. L’équipe', {
          title: text('Titre', HL),
          intro: text('Phrase sous le titre'),
          hint: text('Invitation à cliquer, en bas de chaque carte'),
          back: text('Mention au dos de la carte, pour la retourner'),
          members: fields.array(
            fields.object({
              name: text('Prénom'),
              role: text('Rôle (facultatif)', 'Exemple : Développement, Relation clients. Laissez vide pour ne rien afficher.'),
              photo: fields.image({
                label: 'Photo (facultatif)',
                description: 'Portrait, plutôt carré ou vertical. Sans photo, l’initiale du prénom s’affiche.',
                directory: 'public/equipe',
                publicPath: '/equipe/',
              }),
              bio: long('Présentation', 'Deux ou trois phrases, affichées au dos de la carte quand on clique dessus. Laissez vide pour une carte qui ne se retourne pas.'),
            }),
            { label: 'Membres', itemLabel: (p) => p.fields.name.value || 'Nouveau membre' },
          ),
        }),
        values: group('4. Nos partis pris', {
          title: text('Titre', HL),
          items: fields.array(
            fields.object({
              icon: icon(),
              color: color(),
              title: text('Titre'),
              text: text('Texte'),
            }),
            { label: 'Éléments', description: 'Quatre éléments tiennent sur une ligne.', itemLabel: (p) => p.fields.title.value || 'Nouvel élément' },
          ),
        }),
        blocks: blocks(),
        seo: seo(),
      },
    }),
    demande: singleton({
      label: 'Demande de devis',
      path: 'src/content/demande',
      format: { data: 'json' },
      previewUrl: '/demande-de-devis/',
      schema: {
        breadcrumb: text('Nom de la page', 'Utilisé dans le fil d’Ariane envoyé à Google.'),
        hero: group('1. Haut de page', {
          title: text('Grand titre', HL),
          lead: long('Texte d’introduction', TRIAL),
        }),
        benefits: group(
          '2. Ce que vous obtenez',
          {
            title: text('Titre'),
            points: list('Liste à coches', LINK),
            note: text('Phrase sous la liste', LINK),
          },
          'Les intitulés du formulaire se règlent dans « Formulaire de devis ».',
        ),
        seo: seo(),
      },
    }),
    messages: singleton({
      label: 'Pages « Merci » et « Introuvable »',
      path: 'src/content/messages',
      format: { data: 'json' },
      schema: {
        thanks: group(
          'Page « Merci »',
          {
            seo: seo(),
            title: text('Grand titre'),
            lead: text('Texte'),
            button: text('Bouton'),
          },
          'Affichée après l’envoi du formulaire de devis.',
        ),
        notFound: group(
          'Page « Introuvable »',
          {
            seo: seo(),
            title: text('Grand titre'),
            lead: text('Texte'),
            homeButton: text('Bouton vers l’accueil'),
            priceButton: text('Bouton vers les tarifs'),
          },
          'Affichée quand une adresse n’existe pas (erreur 404).',
        ),
      },
    }),
    pageBlog: singleton({
      label: 'Page d’accueil du blog',
      path: 'src/content/page-blog',
      format: { data: 'json' },
      previewUrl: '/blog/',
      schema: {
        breadcrumb: text('Nom de la rubrique', 'Affiché dans le fil d’Ariane des articles.'),
        hero: group('Haut de page', {
          title: text('Grand titre', HL),
          lead: long('Texte d’introduction'),
        }),
        featured: text('Étiquette du dernier article'),
        allTitle: text('Titre de la liste des articles'),
        readMore: text('Lien vers l’article'),
        seo: seo(),
      },
    }),
    prix: singleton({
      label: 'Prix et briques',
      path: 'src/content/prix',
      format: { data: 'json' },
      previewUrl: '/tarifs/',
      schema: {
        trialDays: fields.integer({
          label: 'Durée de l’essai gratuit (jours)',
          description: 'Reprise partout sur le site, à la place de {essai}.',
          validation: { isRequired: true, min: 0 },
        }),
        tiers: group(
          'Tailles d’équipe',
          {
            solo: tier('Indépendant'),
            s: tier('Petite équipe'),
            m: tier('Équipe moyenne'),
            l: tier('Grande équipe'),
          },
          'Les quatre choix de la question « Combien êtes-vous ? ».',
        ),
        bricks: group(
          'Les briques',
          {
            devis: brick('Devis'),
            factures: brick('Factures'),
            chantiers: brick('Chantiers'),
            achats: brick('Achats'),
            caisse: brick('Caisse'),
            inventaire: brick('Inventaire'),
            eau: brick('Analyse d’eau'),
          },
          'Ajouter ou retirer une brique demande une intervention dans le code (icône, démonstration animée).',
        ),
        allBricks: prices('Prix préférentiel avec toutes les briques (€ HT par mois)'),
        engagements: fields.array(
          fields.object({
            months: fields.integer({ label: 'Durée (mois)', validation: { isRequired: true, min: 1 } }),
            discount: fields.integer({ label: 'Remise (%)', description: '0 pour aucune remise.', defaultValue: 0, validation: { isRequired: true, min: 0, max: 100 } }),
          }),
          {
            label: 'Durées d’engagement',
            description: 'De la plus courte à la plus longue. La plus longue est celle du paiement annuel.',
            itemLabel: (p) => `${p.fields.months.value} mois · remise de ${p.fields.discount.value} %`,
          },
        ),
        annualDiscount: fields.integer({ label: 'Remise pour un paiement une fois par an (%)', description: 'S’ajoute à la remise d’engagement. 0 pour aucune.', validation: { isRequired: true, min: 0, max: 100 } }),
        multiStoreDiscount: fields.integer({ label: 'Remise par magasin à partir du deuxième (%)', description: '0 pour aucune.', validation: { isRequired: true, min: 0, max: 100 } }),
        maxStores: fields.integer({ label: 'Nombre maximum de magasins dans la calculette', validation: { isRequired: true, min: 1 } }),
      },
    }),
    navigation: singleton({
      label: 'Menu et pied de page',
      path: 'src/content/navigation',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        header: group(
          'Menu du haut',
          {
            skip: text('Lien d’accessibilité', 'Visible seulement au clavier.'),
            menuLabel: text('Intitulé du menu déroulant'),
            bricksTitle: text('Titre de la colonne des briques'),
            includedTitle: text('Titre de la colonne des atouts'),
            links: links('Autres liens du menu'),
            cta: group('Bouton à droite', {
              label: text('Texte du bouton'),
              href: text('Adresse'),
            }),
          },
          'Les pages du menu déroulant viennent de « Pages de fonctionnalités ».',
        ),
        footer: group('Pied de page', {
          tagline: long('Phrase sous le logo'),
          featuresTitle: text('Titre de la colonne des briques'),
          includedTitle: text('Titre de la colonne des atouts'),
          companyTitle: text('Titre de la dernière colonne'),
          links: links('Liens de la dernière colonne'),
          copyright: text('Mention tout en bas', '{annee} est remplacé par l’année en cours.'),
        }),
      },
    }),
    commun: singleton({
      label: 'Boutons et textes répétés',
      path: 'src/content/commun',
      format: { data: 'json' },
      schema: {
        home: text('Nom de l’accueil', 'Premier élément du fil d’Ariane.'),
        buttons: group('Boutons', {
          price: text('Bouton vers la calculette'),
          quote: text('Bouton vers la demande de devis'),
          trial: group(
            'Bouton d’essai gratuit',
            {
              before: text('Début'),
              middle: text('Milieu, masqué sur téléphone', TRIAL),
              after: text('Fin'),
            },
            'En trois morceaux : sur téléphone, le milieu est masqué pour que le bouton tienne sur une ligne.',
          ),
        }),
        cta: group(
          'Bandeau d’appel à l’action',
          {
            title: text('Titre par défaut'),
            lead: long('Texte', TRIAL),
          },
          'Le bandeau turquoise en bas de la plupart des pages.',
        ),
        faq: group(
          'Encadré à côté des questions fréquentes',
          {
            title: text('Titre par défaut'),
            intro: text('Phrase sous le titre'),
            askTitle: text('Encadré : titre'),
            askText: text('Encadré : texte'),
            askButton: text('Encadré : bouton'),
          },
        ),
        landing: group('Pages de fonctionnalités', {
          includedSuffix: text('Fin de la pastille des atouts'),
          pointsTitle: text('Titre de l’encadré turquoise', HL),
          otherBricks: text('Titre de la liste des autres briques (sur une brique)'),
          allBricks: text('Titre de la liste des briques (sur un atout)'),
        }),
        article: group('Articles de blog', {
          readTime: text('Après le nombre de minutes'),
          published: text('Avant la date'),
          tocTitle: text('Titre du sommaire'),
          sideTitle: text('Encadré latéral : titre'),
          sideText: text('Encadré latéral : texte', TRIAL),
          moreTitle: text('Titre des autres articles'),
        }),
      },
    }),
    formulaire: singleton({
      label: 'Formulaire de devis',
      path: 'src/content/formulaire',
      format: { data: 'json' },
      previewUrl: '/demande-de-devis/',
      schema: {
        title: text('Titre au-dessus du formulaire', 'Page « Demander un devis ». Sur la page Tarifs, c’est le titre de « 7. Demande de devis » qui s’affiche.'),
        lead: text('Phrase sous le titre'),
        next: list('Étapes « ce qui se passe ensuite »', 'Trois courtes phrases, numérotées dans l’ordre.'),
        progress: text('Intitulé de la barre de progression'),
        activityLabel: text('Question « vous êtes »', 'Page « Demander un devis » uniquement : sur la page Tarifs, la calculette donne déjà ces informations.'),
        activities: list('Réponses à « vous êtes »'),
        bricksLabel: text('Question sur les briques', 'Page « Demander un devis » uniquement. Les briques proposées sont celles de « Prix et briques ».'),
        contactLabel: text('Titre au-dessus des coordonnées'),
        name: text('Champ « nom »'),
        company: text('Champ « société »'),
        phone: text('Champ « téléphone »'),
        email: text('Champ « e-mail »'),
        message: text('Champ « message »'),
        optional: text('Mention « facultatif »'),
        callback: text('Case à cocher « être rappelé »', 'Si la personne coche cette case, la demande reçue indique « rappel : Oui ».'),
        button: text('Bouton d’envoi'),
        legal: long('Mention sous le bouton', LINK),
        errorDisabled: text('Message si l’envoi n’est pas activé'),
        errorFailed: text('Message si l’envoi échoue'),
      },
    }),
    site: singleton({
      label: 'Réglages généraux',
      path: 'src/content/site',
      format: { data: 'json' },
      schema: {
        description: long('Description de Stagnum', 'Transmise à Google dans la fiche du logiciel.'),
        formEndpoint: text(
          'Adresse de réception du formulaire de devis',
          'L’adresse du service qui reçoit les demandes. Tant qu’elle est vide, le formulaire n’envoie rien.',
        ),
      },
    }),
    legal: singleton({
      label: 'Mentions légales et confidentialité',
      path: 'src/content/legal',
      format: { data: 'json' },
      previewUrl: '/mentions-legales/',
      schema: {
        company: group(
          'Informations de l’éditeur',
          {
            raisonSociale: text('Raison sociale'),
            formeJuridique: text('Forme juridique', 'Exemple : SAS, SARL, EI.'),
            capital: text('Capital', 'Exemple : 1 000 €.'),
            siege: text('Adresse du siège'),
            siren: text('Numéro SIREN'),
            rcs: text('Ville d’immatriculation (RCS)'),
            tva: text('Numéro de TVA'),
            email: text('E-mail'),
            telephone: text('Téléphone'),
            directeurPublication: text('Directeur de la publication'),
            hebergeurNom: text('Hébergeur : nom'),
            hebergeurAdresse: text('Hébergeur : adresse'),
            hebergeurTelephone: text('Hébergeur : téléphone'),
          },
          'Tant qu’un champ est vide, le site affiche « [À compléter] » à sa place. À remplir avant la mise en ligne.',
        ),
        mentions: group('Page « Mentions légales »', {
          seo: seo(),
          title: text('Grand titre'),
          sections: legalSections(),
        }),
        privacy: group('Page « Politique de confidentialité »', {
          seo: seo(),
          title: text('Grand titre'),
          sections: legalSections(),
        }),
      },
    }),
  },
});
