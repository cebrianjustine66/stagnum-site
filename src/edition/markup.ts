// Conversion entre le texte enregistré dans src/content/ et ce que l'éditeur affiche.
// Le texte enregistré garde les écritures du site : *surligné*, **gras**, [lien](/adresse/), {essai}…
// L'éditeur les montre telles qu'elles s'affichent sur le site, sans aucun code à retenir.

export type Vars = Record<string, string>;

// Valeurs des {variables}, calculées comme dans src/lib.ts et src/data/legal.ts.
export function computeVars(files: Record<string, any>): Vars {
  const prix = files['src/content/prix.json'];
  const legal = files['src/content/legal.json']?.company ?? {};
  const words = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
  const count = prix ? Object.keys(prix.bricks ?? {}).length : 7;
  const vars: Vars = {
    essai: String(prix?.trialDays ?? ''),
    nb_briques: String(count),
    toutes: words[count] ?? String(count),
    remise_annuelle: `${Math.round(prix?.annualDiscount ?? 0)} %`,
    annee: String(new Date().getFullYear()),
  };
  const legalVars: Record<string, string> = {
    raison_sociale: legal.raisonSociale, forme_juridique: legal.formeJuridique, capital: legal.capital, siege: legal.siege,
    siren: legal.siren, rcs: legal.rcs, tva: legal.tva, email: legal.email, telephone: legal.telephone,
    directeur: legal.directeurPublication, hebergeur_nom: legal.hebergeurNom, hebergeur_adresse: legal.hebergeurAdresse,
    hebergeur_telephone: legal.hebergeurTelephone,
  };
  for (const [k, v] of Object.entries(legalVars)) vars[k] = v || '[À compléter]';
  return vars;
}

// Noms lisibles des variables, pour le menu « Insérer ».
export const VAR_LABELS: Record<string, string> = {
  essai: 'Nombre de jours d’essai',
  nb_briques: 'Nombre de briques (chiffres)',
  toutes: 'Nombre de briques (lettres)',
  remise_annuelle: 'Remise du paiement annuel',
  annee: 'Année en cours',
};

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

// Texte tel qu'il apparaît à l'écran (sans mise en forme) : sert à retrouver le texte dans la page.
export function toPlain(raw: string, vars: Vars) {
  return raw
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// HTML modifiable : surlignage, gras et liens visibles, variables en pastilles non modifiables.
export function toEditHTML(raw: string, vars: Vars, hlClass = 'hl') {
  return esc(raw)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" data-ed-link>$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, `<span class="${hlClass}" data-ed-hl>$1</span>`)
    .replace(/\{(\w+)\}/g, (m, k) => `<span class="ed-var" contenteditable="false" data-var="${k}" title="${esc(VAR_LABELS[k] ?? 'Valeur automatique')}">${esc(k in vars ? vars[k] : m)}</span>`)
    .replace(/\n/g, '<br>');
}

// Retour au texte enregistré, à partir du contenu modifié.
export function fromEditDOM(root: Node): string {
  let out = '';
  root.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      out += (n.nodeValue ?? '').replace(/ /g, ' ');
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as HTMLElement;
    const inner = () => fromEditDOM(el);
    if (el.dataset.var) out += `{${el.dataset.var}}`;
    else if (el.tagName === 'BR') out += '\n';
    else if (el.tagName === 'A') {
      const t = inner();
      out += t.trim() ? `[${t}](${el.getAttribute('href') ?? ''})` : t;
    } else if (el.tagName === 'STRONG' || el.tagName === 'B') {
      const t = inner();
      out += t.trim() ? `**${t}**` : t;
    } else if (el.classList.contains('hl') || el.hasAttribute('data-ed-hl')) {
      const t = inner();
      out += t.trim() ? `*${t}*` : t;
    } else if (el.tagName === 'DIV' || el.tagName === 'P') {
      // Retour à la ligne inséré par le navigateur.
      out += (out && !out.endsWith('\n') ? '\n' : '') + inner();
    } else out += inner();
  });
  return out;
}

// Nettoyage final : pas d'espaces doubles ni de marqueurs vides.
export const tidy = (raw: string) => raw.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');

export const normalize = (s: string) => s.replace(/\s+/g, ' ').replace(/ /g, ' ').trim();
