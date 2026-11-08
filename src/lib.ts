export const faqLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

// Textes saisis dans l'interface d'édition (/keystatic).
// {essai}, {nb_briques}, {toutes}, {remise_annuelle} et {annee} sont remplacés automatiquement.
import { BRICKS, BRICK_COUNT_WORD, TRIAL_DAYS, ANNUAL_PAYMENT_DISCOUNT } from './data/pricing';
export const pct = (d: number) => `${Math.round(d * 100)} %`;
const VARS: Record<string, string | number> = {
  essai: TRIAL_DAYS,
  nb_briques: BRICKS.length,
  toutes: BRICK_COUNT_WORD,
  remise_annuelle: pct(ANNUAL_PAYMENT_DISCOUNT),
  annee: new Date().getFullYear(),
};
export const plain = (s = '') => s.replace(/\{(\w+)\}/g, (m, k) => (k in VARS ? String(VARS[k]) : m));

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// *surligné*, **gras** et [lien](/adresse/) ; à utiliser avec set:html.
export const rich = (s = '', hl = 'hl') =>
  plain(s)
    .replace(/[&<>"']/g, (c) => ESC[c])
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, `<span class="${hl}">$1</span>`);
// Une ligne vide sépare deux paragraphes.
export const paragraphs = (t = '') => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

// Blocs empilables en bas de page (voir components/Blocks.astro et keystatic.config.ts).
type Background = 'clair' | 'sable' | 'fonce';
// Mise en page commune : espacement au-dessus et au-dessous du bloc.
type Layout = { spacing?: 'serre' | 'normal' | 'aere' };
type Cells = { c1: string; c2: string; c3: string; c4: string };
export type Block =
  | { discriminant: 'texte'; value: Layout & { title: string; text: string; background: Background; align?: 'gauche' | 'centre'; width?: 'etroit' | 'large' } }
  | { discriminant: 'liste'; value: Layout & { title: string; intro: string; items: string[]; background: Background; layout?: 'gauche' | 'droite' | 'empile' } }
  | { discriminant: 'cartes'; value: Layout & { title: string; cards: { icon: string; title: string; text: string; href: string }[]; columns?: '2' | '3' | '4'; background?: Background } }
  | { discriminant: 'etapes'; value: Layout & { title: string; steps: { title: string; text: string }[]; background?: Background } }
  | { discriminant: 'tableau'; value: Layout & { title: string; intro: string; columns: '2' | '3' | '4'; head: Cells; rows: Cells[]; background?: Background } }
  | { discriminant: 'encadre'; value: Layout & { style: 'conseil' | 'attention' | 'exemple'; title: string; text: string; width?: 'etroit' | 'large' } }
  | { discriminant: 'equipe'; value: { title: string; text: string; button: string; href: string } }
  | { discriminant: 'cta'; value: { title: string } }
  | { discriminant: 'faq'; value: { title: string; items: { q: string; a: string }[] } };
