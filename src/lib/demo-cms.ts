// Démo CMS (prototype local) : un mini « classeur » lu en direct par le site.
// But : prouver qu'une modification est INSTANTANÉE, sans commit GitHub ni rebuild.
// Les données vivent dans un fichier JSON local (ici un fichier ; demain, une base).
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type Article = { id: string; titre: string; chapo: string; date: string };
export type Store = {
  hero: { titre: string; sous_titre: string };
  intro: string;
  articles: Article[];
};

const FILE = resolve(process.cwd(), '.demo-cms.json');

export const DEFAULT: Store = {
  hero: {
    titre: 'Le logiciel des piscinistes, pensé pour le terrain',
    sous_titre: 'Toute l’équipe incluse, sans formation, avec un vrai accompagnement.',
  },
  intro:
    'Ceci est une page de démonstration. Clique sur « Modifier » en haut à droite, change un texte ou ajoute un article, puis « Enregistrer » : c’est en ligne tout de suite, sans attendre de déploiement.',
  articles: [
    {
      id: 'a1',
      titre: 'Bien préparer l’ouverture de saison',
      chapo: 'Les étapes pour démarrer la saison sereinement avec ses clients.',
      date: '2026-11-10',
    },
  ],
};

export async function readStore(): Promise<Store> {
  try {
    return JSON.parse(await readFile(FILE, 'utf8')) as Store;
  } catch {
    return structuredClone(DEFAULT);
  }
}

export async function writeStore(store: Store): Promise<void> {
  await writeFile(FILE, JSON.stringify(store, null, 2), 'utf8');
}
