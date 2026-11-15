// Les trois « mondes » de l'accueil : un seul outil, trois moments de la journée.
// Chaque monde ouvre une page (/sur-le-terrain/, /au-comptoir/, /au-bureau/) qui
// détaille ses briques, dans le style des briques du site (carte teintée + mini-démo).
// Contenu validé en maquette (Version B). Les briques marquées `soon` sont montrées
// « À venir », jamais comme déjà là.

// Une ligne de mini-démo : soit une jauge (analyse d'eau), soit une barre de marge,
// soit une ligne clé/valeur avec une pastille ou un total.
export type MiniLine =
  | { gauge: string; pos: number; value: string }
  | { bar: number }
  | { left: string; value?: string; pill?: string; kind?: 'ok' | 'warn'; total?: boolean; sub?: boolean };

export type MondeBrick = {
  name: string;
  icon: string; // contenu interne du <svg> (viewBox 0 0 24 24)
  bg: string;
  fg: string;
  dark?: boolean;
  soon?: boolean; // badge « À venir »
  desc: string;
  demo: MiniLine[];
  more?: string; // libellé de l'affordance (défaut : « Voir la démonstration »)
};

export type Monde = {
  slug: string;
  nav: string; // libellé court (menu, cartes croisées)
  title: string; // « Sur le terrain »
  where: string; // « Le camion, le bord du bassin »
  icon: string; // tuile du monde
  bg: string;
  fg: string;
  dark?: boolean;
  teaser: string; // description sur la carte d'accueil
  chips: { label: string; soon?: boolean }[]; // briques résumées sur la carte d'accueil
  heroLead: string; // chapô de la page détail (peut contenir <b>)
  count: string; // « 5 briques · ... »
  cta: { title: string; text: string };
  bricks: MondeBrick[];
};

// Tuiles des mondes (icônes reprises du jeu du site)
const IC_CAMION = '<path d="M2 7h11v9H2zM13 10h4l4 3v3h-8z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>';
const IC_MAGASIN = '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16"/><path d="M9 20v-6h6v6"/>';
const IC_BUREAU = '<path d="M4 8h16v12H4zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16"/>';

export const MONDES_HEAD = {
  eyebrow: 'Tout votre métier, au même endroit',
  title: 'Un seul outil, *trois moments* de votre journée',
  lead: 'Pas une liste de modules à cocher. Cliquez sur un moment de votre journée pour voir toutes ses briques.',
  base: 'Et sous tout ça : le fichier clients et bassins, votre équipe, vos réglages. Communs à tout, réglés une seule fois.',
};

export const MONDES: Monde[] = [
  {
    slug: 'sur-le-terrain',
    nav: 'Sur le terrain',
    title: 'Sur le terrain',
    where: 'Le camion, le bord du bassin',
    icon: IC_CAMION,
    bg: '#0F5358',
    fg: '#FFFFFF',
    dark: true,
    teaser: 'Le technicien fait l’analyse sur place, dicte son passage, prend la photo. Le bureau reçoit tout, propre, en direct.',
    chips: [{ label: 'Analyse d’eau' }, { label: 'Interventions' }, { label: 'Rapports' }, { label: 'Agenda' }, { label: 'Tâches' }],
    heroLead: 'Le technicien fait l’analyse sur place, dicte son passage, prend la photo. <b>Le bureau reçoit tout, propre, en direct.</b> Rien à retaper le soir.',
    count: '5 briques · pensées pour le téléphone, les doigts mouillés',
    cta: {
      title: 'Le copilote connaît votre terrain',
      text: '« Montre-moi les passages de demain », « prépare le rapport de l’intervention de ce matin ». Vous demandez, il prépare, vous validez.',
    },
    bricks: [
      {
        name: 'Analyse d’eau',
        icon: '<path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
        bg: '#DDF2F3',
        fg: '#0E2224',
        desc: 'Vous passez la bandelette sous la photo, ou vous reliez le SpinTouch. Le plan de traitement s’affiche, chiffré, aux produits de votre magasin.',
        demo: [
          { gauge: 'pH', pos: 85, value: '7,8' },
          { gauge: 'Chlore', pos: 17, value: '0,5' },
          { gauge: 'TAC', pos: 44, value: '90' },
        ],
      },
      {
        name: 'Interventions',
        icon: '<path d="M3 20h18M5 20V9l7-5 7 5v11"/><path d="M10 20v-6h4v6"/>',
        bg: '#0F5358',
        fg: '#FFFFFF',
        dark: true,
        desc: 'Chaque passage est planifié, réalisé, réglé. Du créneau au bord du bassin jusqu’à la facture, le fil ne se casse pas.',
        demo: [
          { left: 'Mar 9h · Villa Moreau', pill: 'Planifiée' },
          { left: 'Jeu 14h · Les Tilleuls', pill: 'Réalisée', kind: 'ok' },
          { left: '3 passages', value: 'cette semaine', total: true },
        ],
      },
      {
        name: 'Rapports dictés',
        icon: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
        bg: '#FBE6D2',
        fg: '#0E2224',
        desc: 'Le technicien dicte trente secondes, ajoute une photo, fait signer à l’écran. Le compte rendu part chez le client, le passage est prouvé.',
        demo: [
          { left: 'Passage du 12/11', pill: 'Signé', kind: 'ok' },
          { left: 'Photos jointes', value: '2' },
          { left: 'Dicté en 30 s', value: 'Envoyé', total: true },
        ],
      },
      {
        name: 'Agenda et tournées',
        icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
        bg: '#E1F3F1',
        fg: '#0E2224',
        desc: 'Toutes les journées au même endroit : passages, tâches, chantiers. Chacun ouvre sa tournée sur son téléphone le matin.',
        demo: [
          { left: 'Lundi', value: '4 passages' },
          { left: 'Mardi · tournée', value: '38 km' },
          { left: 'Mercredi', value: '2 chantiers' },
        ],
      },
      {
        name: 'Tâches du jour',
        icon: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        bg: '#F8DDD0',
        fg: '#0E2224',
        desc: 'Ce qu’il y a à faire, pour qui, pour quand. Rien ne se perd entre le camion et le comptoir.',
        demo: [
          { left: 'Rappeler M. Faure', pill: 'Aujourd’hui', kind: 'warn' },
          { left: 'Commander galets', pill: 'Demain' },
          { left: '5 tâches', value: 'à faire', total: true },
        ],
      },
    ],
  },
  {
    slug: 'au-comptoir',
    nav: 'Au comptoir',
    title: 'Au comptoir',
    where: 'Le magasin',
    icon: IC_MAGASIN,
    bg: '#FBE6D2',
    fg: '#0E2224',
    teaser: 'Un client entre, vous le reconnaissez à sa fiche. Vous encaissez, le stock se met à jour tout seul.',
    chips: [{ label: 'Caisse' }, { label: 'Articles' }, { label: 'Stock' }, { label: 'Achats' }, { label: 'Fiche client' }],
    heroLead: 'Un client entre, vous le reconnaissez à sa fiche. <b>Vous encaissez, le stock se met à jour tout seul.</b> La caisse est conforme, sans y penser.',
    count: '5 briques · le comptoir, le stock, le fichier du magasin',
    cta: {
      title: 'Le copilote tient le comptoir avec vous',
      text: '« Combien de pH moins il me reste ? », « le dernier ticket de Madame Faure ». Il lit votre magasin et répond en français.',
    },
    bricks: [
      {
        name: 'Caisse',
        icon: '<rect x="3" y="11" width="18" height="9" rx="2"/><path d="M7 11V5h10v6M10 8h4M7 15h2M11 15h2M15 15h2"/>',
        bg: '#F8DDD0',
        fg: '#0E2224',
        desc: 'Vous scannez, vous encaissez, vous rendez la monnaie. Chaque vente est inaltérable et le journal est tenu tout seul.',
        demo: [
          { left: 'Chlore choc 5 kg', value: '34,90 €' },
          { left: 'Bandelettes', value: '12,50 €' },
          { left: 'À encaisser', value: '47,40 €', total: true },
        ],
      },
      {
        name: 'Articles et tarifs',
        icon: '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
        bg: '#E1F3F1',
        fg: '#0E2224',
        desc: 'Votre catalogue, marchandises et prestations. Chaque article sait quel traitement il règle : il arrive tout seul dans la prescription.',
        demo: [
          { left: 'Chlore choc 5 kg', value: '34,90 €' },
          { left: 'Galets 250 g', value: '6,20 €' },
          { left: '412 références', value: 'à jour', total: true },
        ],
      },
      {
        name: 'Stock',
        icon: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
        bg: '#0B3D42',
        fg: '#FFFFFF',
        dark: true,
        desc: 'Le stock qui se tient à jour tout seul, au fil des ventes et des chantiers. Vous voyez ce qui manque avant d’en manquer.',
        demo: [
          { left: 'Chlore choc 5 kg', value: '12' },
          { left: 'Galets 250 g', pill: '8 · à commander', kind: 'warn' },
          { left: 'Robots', value: '2' },
        ],
      },
      {
        name: 'Achats fournisseurs',
        icon: '<path d="M9 4h6v3H9z"/><path d="M9 5.5H6v15h12v-15h-3M12 10.5v6M9.5 14l2.5 2.5 2.5-2.5"/>',
        bg: '#F3EDE2',
        fg: '#0E2224',
        desc: 'Vous photographiez le bon de livraison. L’achat se remplit, le stock monte, rien à retaper.',
        demo: [
          { left: 'BL n° 4471', pill: 'Lu', kind: 'ok' },
          { left: 'Chlore choc 5 kg', value: '× 24' },
          { left: '3 lignes', value: 'Rien à retaper', total: true },
        ],
      },
      {
        name: 'Fiche client et bassins',
        icon: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
        bg: '#DDF2F3',
        fg: '#0E2224',
        desc: 'Un client, ses bassins, tout son historique. Le fichier appartient au magasin, pas au vendeur qui part.',
        demo: [
          { left: 'Famille Dubois', pill: 'Client', kind: 'ok' },
          { left: '2 bassins · 48 m³', value: 'Liner' },
          { left: '9 passages', value: 'sans contrat', total: true },
        ],
      },
    ],
  },
  {
    slug: 'au-bureau',
    nav: 'Au bureau',
    title: 'Au bureau',
    where: 'La gestion, sans paperasse du soir',
    icon: IC_BUREAU,
    bg: '#E1F3F1',
    fg: '#0E2224',
    teaser: 'Le devis signé devient chantier, facture et commande. La relance part au bon délai, toute seule.',
    chips: [{ label: 'Devis' }, { label: 'Factures' }, { label: 'Bons de commande' }, { label: 'Chantiers' }, { label: 'Banque', soon: true }],
    heroLead: 'Le devis signé devient chantier, facture et commande. <b>La relance part au bon délai, toute seule.</b> Vos soirées vous reviennent.',
    count: '5 briques · devis, factures, chantiers, prêtes pour 2027',
    cta: {
      title: 'Le copilote prépare votre bureau',
      text: '« Qui me doit de l’argent ? », « fais la facture du chantier des Tilleuls ». Il prépare, vous validez, rien ne part sans vous.',
    },
    bricks: [
      {
        name: 'Devis',
        icon: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
        bg: '#0F5358',
        fg: '#FFFFFF',
        dark: true,
        desc: 'Vous décrivez le chantier d’une phrase, ou vous partez de l’analyse d’eau. Le devis est prêt à relire, sans ressaisie.',
        demo: [
          { left: 'Liner armé 8 × 4 m', value: '3 180 €' },
          { left: 'Pompe à chaleur', value: '2 450 €' },
          { left: 'Total HT', value: '5 630 €', total: true },
        ],
      },
      {
        name: 'Factures',
        icon: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M14.5 9.5a3 3 0 1 0 0 5M9 11h4M9 13h4"/>',
        bg: '#E1F3F1',
        fg: '#0E2224',
        desc: 'Une facture dépasse le délai que vous avez réglé, la relance part toute seule. Inaltérable, pointée au paiement.',
        demo: [
          { left: 'F-0218 · Durand', pill: 'Payée', kind: 'ok' },
          { left: 'F-0221 · Camping du Lac', pill: 'Relancée', kind: 'warn' },
          { left: 'F-0224 · Petit', pill: 'À échéance' },
        ],
      },
      {
        name: 'Bons de commande',
        icon: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8.5 13l2 2 4-4"/>',
        bg: '#F3EDE2',
        fg: '#0E2224',
        desc: 'Le devis est accepté, le bon de commande suit. Un devis, un bon de commande, pas de confusion.',
        demo: [
          { left: 'BC-0096 · Zodiac', pill: 'Envoyé', kind: 'ok' },
          { left: 'Robot RV 5500', value: '× 1' },
          { left: 'depuis devis D-0451', value: 'relié', total: true },
        ],
      },
      {
        name: 'Chantiers et marge',
        icon: '<path d="M3 20h18M5 20V9l7-5 7 5v11"/><path d="M10 20v-6h4v6"/>',
        bg: '#FBE6D2',
        fg: '#0E2224',
        desc: 'Tout un chantier dans un dossier : devis, commandes, factures, heures. La marge se recalcule dès que vous notez deux heures de plus.',
        demo: [
          { left: 'Chantier Bernard', value: 'Marge 42 %' },
          { bar: 68 },
          { left: 'Terrassement terminé', value: '68 %', sub: true },
        ],
      },
      {
        name: 'Banque et rapprochement',
        icon: '<path d="M4 10h16M5 10l7-5 7 5M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16"/>',
        bg: '#0B3D42',
        fg: '#FFFFFF',
        dark: true,
        soon: true,
        desc: 'Le virement arrive, il se relie tout seul à la bonne facture. Fin de mois réconciliée sans pointer ligne à ligne.',
        demo: [
          { left: 'Virement 1 240 €', pill: 'Rapproché', kind: 'ok' },
          { left: 'F-0218 · Durand', value: 'payée' },
          { left: 'Fin de mois', value: 'à jour', total: true },
        ],
        more: 'Aperçu de la brique',
      },
    ],
  },
];

export const bySlug = (slug: string) => MONDES.find((m) => m.slug === slug)!;
