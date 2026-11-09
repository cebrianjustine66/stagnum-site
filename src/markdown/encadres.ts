// Encadrés des articles : une citation qui commence par [!conseil], [!attention] ou [!exemple]
// devient un encadré coloré. La suite de la première ligne en est le titre.
//   > [!conseil] Bon à savoir
//   >
//   > Le texte de l'encadré.
const LABELS: Record<string, string> = { conseil: 'Bon à savoir', attention: 'Attention', exemple: 'Exemple' };

export function encadres(html: string) {
  return html.replace(/<blockquote>\s*<p>\s*\[!(\w+)\][ \t]*([\s\S]*?)<\/p>/g, (_, k: string, title: string) => {
    const kind = k.toLowerCase();
    return `<blockquote class="encadre encadre-${kind}"><p class="encadre-titre">${title.trim() || LABELS[kind] || ''}</p>`;
  });
}
