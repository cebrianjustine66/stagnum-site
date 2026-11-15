// Chargeur de contenu pour les pages du site.
// Renvoie le contenu PUBLIÉ depuis la base. REPLI DE SÉCURITÉ : si la base est vide
// ou injoignable (ex. en ligne tant qu'elle n'est pas branchée), on retombe sur le
// fichier JSON d'origine — la page s'affiche toujours.
import { getDoc } from './store';

export async function loadPublished<T>(key: string, fallback: T): Promise<T> {
  try {
    const doc = await getDoc<T>(key);
    return doc.published ?? fallback;
  } catch {
    return fallback;
  }
}
