// Toute la tarification du site. Les valeurs viennent de src/content/prix.json et se modifient
// depuis l'interface d'édition (/keystatic, « Prix et briques »). Les prix sont en € HT par mois
// et par magasin, pour un engagement de 3 mois. Ordre des colonnes : voir TIERS.
import prix from '../content/prix.json';

const TIER_IDS = ['solo', 's', 'm', 'l'] as const;
const BRICK_IDS = ['devis', 'factures', 'chantiers', 'achats', 'caisse', 'inventaire', 'eau'] as const;
const byTier = (v: Record<(typeof TIER_IDS)[number], number>) => TIER_IDS.map((t) => v[t]);

export const TIERS = TIER_IDS.map((id) => ({ id, ...prix.tiers[id] }));

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

export const BRICKS = BRICK_IDS.map((id) => {
  const b = prix.bricks[id];
  return { id: id as string, name: b.name, desc: b.desc, prices: byTier(b.prices), href: b.href };
});

// « six », « sept »… pour écrire le nombre de briques en toutes lettres.
export const BRICK_COUNT_WORD = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'][BRICKS.length];

// Prix préférentiel appliqué quand toutes les briques sont cochées (même ordre que TIERS).
export const ALL_BRICKS_PRICES = byTier(prix.allBricks);

// Les remises sont saisies en pourcentage (10 pour 10 %).
export const ENGAGEMENTS = prix.engagements.map((e) => ({ months: e.months, discount: e.discount / 100 }));

export const TRIAL_DAYS = prix.trialDays;

// Remise supplémentaire pour un paiement en une fois par an (0 = aucune). Le paiement annuel engage sur 12 mois.
export const ANNUAL_PAYMENT_DISCOUNT = prix.annualDiscount / 100;

// Remise appliquée à chaque magasin à partir du deuxième (0 = aucune).
export const MULTI_STORE_DISCOUNT = prix.multiStoreDiscount / 100;
export const MAX_STORES = prix.maxStores;

// Quota de demandes IA par magasin et par mois : 10 demandes par jour travaillé (22 jours)
// et par personne, à l'effectif maximum de la fourchette. Non affiché sur le site pour l'instant.
export const AI_QUOTA = { show: false, perStore: [220, 1100, 2200, 4400] };

export const LOWEST_PRICE = Math.min(...BRICKS.map((b) => b.prices[0]));
