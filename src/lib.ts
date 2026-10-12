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
// {essai}, {nb_briques} et {toutes} sont remplacés par les valeurs de pricing.ts.
import { BRICKS, BRICK_COUNT_WORD, TRIAL_DAYS } from './data/pricing';
const VARS: Record<string, string | number> = { essai: TRIAL_DAYS, nb_briques: BRICKS.length, toutes: BRICK_COUNT_WORD };
export const plain = (s = '') => s.replace(/\{(\w+)\}/g, (m, k) => (k in VARS ? String(VARS[k]) : m));

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// *surligné*, **gras** et [lien](/adresse/) ; à utiliser avec set:html.
export const rich = (s = '', hl = 'hl') =>
  plain(s)
    .replace(/[&<>"']/g, (c) => ESC[c])
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, `<span class="${hl}">$1</span>`);

// Blocs empilables en bas de page (voir components/Blocks.astro et keystatic.config.ts).
type Background = 'clair' | 'sable' | 'fonce';
export type Block =
  | { discriminant: 'texte'; value: { title: string; text: string; background: Background } }
  | { discriminant: 'liste'; value: { title: string; intro: string; items: string[]; background: Background } }
  | { discriminant: 'cartes'; value: { title: string; cards: { icon: string; title: string; text: string; href: string }[] } }
  | { discriminant: 'cta'; value: { title: string } }
  | { discriminant: 'faq'; value: { title: string; items: { q: string; a: string }[] } };
