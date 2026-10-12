// Toute la tarification du site est ici. Les prix sont en € HT par mois et par magasin,
// pour un engagement de 3 mois. Ordre des colonnes : voir TIERS.

export const TIERS = [
  { id: 'solo', label: 'Indépendant', sub: 'Je travaille seul' },
  { id: 's', label: '2 à 5', sub: 'personnes' },
  { id: 'm', label: '6 à 10', sub: 'personnes' },
  { id: 'l', label: '11 à 20', sub: 'personnes' },
];

// Chaque brique a sa couleur de carte : fond, texte.
export const BRICK_COLORS: Record<string, [string, string]> = {
  devis: ['#0F5358', '#FFFFFF'],
  factures: ['#E1F3F1', '#0E2224'],
  chantiers: ['#FBE6D2', '#0E2224'],
  achats: ['#F3EDE2', '#0E2224'],
  caisse: ['#F8DDD0', '#0E2224'],
  inventaire: ['#0B3D42', '#FFFFFF'],
  eau: ['#DDF2F3', '#0E2224'],
};

export const BRICKS = [
  { id: 'devis', name: 'Devis', desc: 'Décrivez le besoin, le devis est prêt.', prices: [15, 17, 19, 21], href: '/logiciel-devis-piscine/' },
  { id: 'factures', name: 'Factures', desc: 'Factures et relances de paiement.', prices: [19, 22, 24, 26], href: '/logiciel-facturation-pisciniste/' },
  { id: 'chantiers', name: 'Chantiers', desc: 'Suivi, rentabilité et application mobile.', prices: [19, 22, 24, 26], href: '/suivi-chantier-piscine/' },
  // Prix de la brique Achats provisoire, à confirmer.
  { id: 'achats', name: 'Achats', desc: 'Le bon de livraison remplit vos achats.', prices: [19, 22, 24, 26], href: '/logiciel-achats-pisciniste/' },
  { id: 'caisse', name: 'Caisse', desc: 'Encaissez au comptoir du magasin.', prices: [10, 11, 13, 14], href: '/logiciel-caisse-magasin-piscine/' },
  { id: 'inventaire', name: 'Inventaire', desc: 'Votre stock à jour, sans tableur.', prices: [19, 22, 24, 26], href: '/gestion-stock-magasin-piscine/' },
  { id: 'eau', name: 'Analyse d’eau', desc: 'Mesures, diagnostic et traitement.', prices: [23, 26, 29, 32], href: '/logiciel-analyse-eau-piscine/' },
];

// « six », « sept »… pour écrire le nombre de briques en toutes lettres.
export const BRICK_COUNT_WORD = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'][BRICKS.length];

// Prix préférentiel appliqué quand toutes les briques sont cochées (même ordre que TIERS).
export const ALL_BRICKS_PRICES = [105, 121, 133, 145];

export const ENGAGEMENTS = [
  { months: 3, discount: 0 },
  { months: 6, discount: 0.1 },
  { months: 12, discount: 0.2 },
];

export const TRIAL_DAYS = 14;

// Remise supplémentaire pour un paiement en une fois par an (0 = aucune). Le paiement annuel engage sur 12 mois.
export const ANNUAL_PAYMENT_DISCOUNT = 0.2;

// Remise appliquée à chaque magasin à partir du deuxième (0 = aucune).
export const MULTI_STORE_DISCOUNT = 0;
export const MAX_STORES = 5;

// Quota de demandes IA par magasin et par mois : 10 demandes par jour travaillé (22 jours)
// et par personne, à l'effectif maximum de la fourchette. Non affiché sur le site pour l'instant.
export const AI_QUOTA = { show: false, perStore: [220, 1100, 2200, 4400] };

export const LOWEST_PRICE = Math.min(...BRICKS.map((b) => b.prices[0]));
