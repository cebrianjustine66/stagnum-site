// Ce que l'éditeur sait des contenus : quelles rubriques existent, sur quelle page elles s'affichent,
// et la description de chaque champ. Tout vient de keystatic.config.ts, qui reste la référence.
import config from '../../keystatic.config';
import { isNewPost, isPost, postSlug } from './posts';

export type Field = any;
export type Path = (string | number)[];

export interface Entry {
  id: string; // chemin du fichier, ex. src/content/accueil.json
  label: string;
  url?: string; // page du site où le contenu s'affiche
  schema: Record<string, Field>;
  scope: 'page' | 'site';
}

// Rubriques présentes sur toutes les pages (menu, boutons, formulaire, prix des briques…).
const SITE_WIDE = ['navigation', 'commun', 'formulaire', 'prix', 'apropos', 'site', 'legal', 'messages', 'pageBlog'];
// Pages dont l'adresse n'est pas indiquée dans la configuration.
const EXTRA_URLS: Record<string, string[]> = {
  messages: ['/merci/'],
  legal: ['/mentions-legales/', '/confidentialite/'],
};

export const REPO = (config.storage as any).repo as string | undefined;

export function singletonEntries(): Entry[] {
  return Object.entries(config.singletons ?? {}).map(([key, s]: [string, any]) => ({
    id: `${s.path}.json`,
    label: s.label,
    url: s.previewUrl,
    schema: s.schema,
    scope: SITE_WIDE.includes(key) ? 'site' : 'page',
    key,
  }));
}

// Pages de fonctionnalités : un fichier par page dans src/content/pages/.
export function pageEntries(files: Record<string, any>): Entry[] {
  const col = (config.collections as any).pages;
  return Object.keys(files)
    .filter((p) => p.startsWith('src/content/pages/') && p.endsWith('.json'))
    .map((p) => {
      const slug = p.slice('src/content/pages/'.length, -'.json'.length);
      return { id: p, label: files[p]?.nav || slug, url: `/${slug}/`, schema: col.schema, scope: 'page' as const };
    })
    .sort((a, b) => (files[a.id]?.order ?? 99) - (files[b.id]?.order ?? 99));
}

// Articles du blog. Leurs textes se modifient directement dans la page de l'article (voir inline.ts).
export const POST_SCHEMA = (config.collections as any).posts.schema;
const POST_TEXTS = {
  h1: { kind: 'form', label: 'Titre de l’article' },
  description: { kind: 'form', label: 'Résumé', multiline: true },
  tag: { kind: 'form', label: 'Thème' },
};
export function postEntries(files: Record<string, any>): Entry[] {
  return Object.keys(files)
    .filter((p) => isPost(p) && files[p])
    .map((p) => ({ id: p, label: files[p].h1 || 'Article', url: isNewPost(p) ? undefined : `/blog/${postSlug(p)}/`, schema: POST_TEXTS, scope: 'page' as const }));
}

export function allEntries(files: Record<string, any>) {
  return [...singletonEntries(), ...pageEntries(files), ...postEntries(files)];
}

// Blocs empilables en bas des pages (« Blocs supplémentaires »).
export const BLOCK_FIELD = (config.singletons as any).accueil.schema.blocks;
export const BLOCK_TYPES = BLOCK_FIELD.element.discriminant.options as { label: string; value: string }[];
export const blockLabel = (type: string) => BLOCK_TYPES.find((t) => t.value === type)?.label.split(' :')[0] ?? 'Bloc';

// Contenu d'un nouveau bloc : des textes d'exemple, pour qu'on puisse cliquer dessus et les écrire.
export function starterBlock(type: string): { discriminant: string; value: any } {
  const v: Record<string, any> = {
    texte: { title: 'Votre *titre*', text: 'Votre texte. Cliquez dessus pour l’écrire.', background: 'clair' },
    liste: { title: 'Votre *titre*', intro: 'Une phrase d’introduction.', items: ['Premier point', 'Deuxième point', 'Troisième point'], background: 'sable' },
    cartes: {
      title: 'Titre au-dessus des *cartes*',
      cards: [
        { icon: 'devis', title: 'Première carte', text: 'Le texte de la première carte.', href: '' },
        { icon: 'chantiers', title: 'Deuxième carte', text: 'Le texte de la deuxième carte.', href: '' },
        { icon: 'factures', title: 'Troisième carte', text: 'Le texte de la troisième carte.', href: '' },
      ],
    },
    etapes: {
      title: 'En trois *étapes*',
      steps: [
        { title: 'Première étape', text: 'Ce qui se passe d’abord.' },
        { title: 'Deuxième étape', text: 'Ce qui se passe ensuite.' },
        { title: 'Troisième étape', text: 'Et pour finir.' },
      ],
    },
    equipe: { title: 'L’*équipe*', text: 'Quelques mots sur l’équipe.', button: 'Qui sommes-nous', href: '/a-propos/' },
    cta: { title: 'Prêt à essayer Stagnum ?' },
    faq: { title: 'Questions fréquentes', items: [{ q: 'Première question ?', a: 'La réponse.' }, { q: 'Deuxième question ?', a: 'La réponse.' }] },
  };
  return { discriminant: type, value: structuredClone(v[type] ?? {}) };
}

const clean = (u: string) => (u.endsWith('/') ? u : `${u}/`);

// Contenus affichés sur une adresse donnée : d'abord ceux de la page, puis ceux de tout le site.
export function entriesForUrl(url: string, files: Record<string, any>) {
  const all = allEntries(files) as (Entry & { key?: string })[];
  const u = clean(url);
  // Le menu et les boutons communs restent dans « Tout le site », même sur leur page d'aperçu.
  const own = all.filter((e) => (e.url && clean(e.url) === u && !['navigation', 'commun'].includes(e.key ?? '')) || (e.key && EXTRA_URLS[e.key]?.includes(u)));
  // Ordre de priorité quand un même texte existe à deux endroits : le menu et les boutons avant les petites pages.
  const rank = (e: Entry & { key?: string }) => SITE_WIDE.indexOf(e.key ?? '');
  const site = all.filter((e) => e.scope === 'site' && !own.includes(e)).sort((a, b) => rank(a) - rank(b));
  return { own, site };
}

// Pages proposées dans le sélecteur, dans l'ordre du menu de l'ancien éditeur.
export function pickerPages(files: Record<string, any>) {
  const s = singletonEntries() as (Entry & { key: string })[];
  const by = (k: string) => s.find((e) => e.key === k)!;
  return [
    { group: 'Pages principales', items: [
      { label: 'Accueil', url: '/' },
      { label: 'Tarifs', url: '/tarifs/' },
      { label: 'Demander un devis', url: '/demande-de-devis/' },
      { label: 'Qui sommes-nous', url: by('apropos')?.url ?? '/a-propos/' },
      { label: 'Comparatif Extrabat', url: by('comparatif')?.url ?? '/alternative-extrabat/' },
      { label: 'Blog', url: '/blog/' },
    ] },
    { group: 'Fonctionnalités', items: pageEntries(files).map((e) => ({ label: e.label, url: e.url! })) },
    { group: 'Articles du blog', items: Object.keys(files)
      .filter((p) => isPost(p) && files[p])
      .sort((a, b) => String(files[b].date).localeCompare(String(files[a].date)))
      .map((p) => ({ label: files[p].h1 || 'Article', url: isNewPost(p) ? `article:${p}` : `/blog/${postSlug(p)}/` })) },
    { group: 'Autres pages', items: [
      { label: 'Merci (après le formulaire)', url: '/merci/' },
      { label: 'Mentions légales', url: '/mentions-legales/' },
      { label: 'Confidentialité', url: '/confidentialite/' },
    ] },
  ];
}

// Champ décrit à un chemin donné (ex. ['faq', 2, 'q']). Pour les blocs, value (le contenu) indique leur type.
export function fieldAt(schema: Record<string, Field>, path: Path, value?: any): Field | undefined {
  let f: Field = { kind: 'object', fields: schema };
  let v = value;
  for (const k of path) {
    if (!f) return undefined;
    if (f.kind === 'object') f = f.fields[k as string];
    else if (f.kind === 'array') f = typeof k === 'number' ? f.element : undefined;
    else if (f.kind === 'conditional') f = k === 'discriminant' ? f.discriminant : k === 'value' ? f.values?.[v?.discriminant] : undefined;
    else return undefined;
    v = v?.[k as any];
  }
  return f;
}

// Les descriptions de l'ancien éditeur expliquent des codes (*…*, [lien](…), {essai}) que le nouvel éditeur rend inutiles.
export function cleanDescription(d?: string) {
  if (!d) return '';
  return d
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !/astérisques|\[texte du lien\]|\{\w+\}|remplacés? par/.test(s))
    .join(' ')
    .trim();
}

// Ce qu'un champ texte accepte, d'après sa description dans la configuration.
export function richness(field: Field) {
  const d = field?.description ?? '';
  return { hl: /astérisques/.test(d), link: /\[texte du lien\]/.test(d), vars: /\{\w+\}/.test(d) };
}

export const isMultiline = (field: Field) => field?.multiline === true;
