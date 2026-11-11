// Contenu des pages de fonctionnalités et des pages par profil.
// Une entrée = un fichier de src/content/pages/, servi à la racine du site (/<slug>/).
// Ces fichiers se modifient depuis l'interface d'édition (/keystatic).

import type { Block } from '../lib';

export type Landing = {
  slug: string;
  order: number;
  kind: 'brique' | 'atout' | 'profil'; // profil : page par métier, rubrique « Par métier » du menu
  nav: string;
  brick?: string; // id dans pricing.ts
  included?: string; // pour les atouts : avec quelles briques ils viennent
  withBricks?: string; // version courte pour le menu
  title: string;
  description: string;
  h1: string;
  lead: string;
  voice?: { said: string; done: string[] };
  sections: { h2: string; text: string }[];
  points: string[];
  faq: { q: string; a: string }[];
  blocks: Block[];
};

type Entry = Omit<Landing, 'slug' | 'voice'> & { voice: NonNullable<Landing['voice']> };
const files = import.meta.glob<Entry>('../content/pages/*.json', { eager: true, import: 'default' });

export const LANDINGS: Landing[] = Object.entries(files)
  .map(([path, e]) => ({
    ...e,
    slug: path.split('/').pop()!.replace(/\.json$/, ''),
    brick: e.brick && e.brick !== 'aucune' ? e.brick : undefined,
    included: e.included || undefined,
    withBricks: e.withBricks || undefined,
    voice: e.voice?.said ? e.voice : undefined,
    blocks: e.blocks ?? [],
  }))
  .sort((a, b) => a.order - b.order);

export const bySlug = (slug: string) => LANDINGS.find((l) => l.slug === slug)!;
export const BRIQUE_PAGES = LANDINGS.filter((l) => l.kind === 'brique');
