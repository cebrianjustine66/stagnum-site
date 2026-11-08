// Articles du blog dans l'éditeur visuel : un fichier Markdown par article (src/content/blog/).
// L'éditeur les manipule comme un objet { h1, description, tag, date…, content }.

export const BLOG_DIR = 'src/content/blog/';
export const isPost = (p: string) => p.startsWith(BLOG_DIR) && p.endsWith('.md');
// Article créé dans l'éditeur et pas encore publié : son adresse est fixée à la publication, d'après son titre.
export const isNewPost = (p: string) => p.startsWith(`${BLOG_DIR}__nouveau-`);
export const postSlug = (p: string) => p.slice(BLOG_DIR.length, -'.md'.length);

export type Post = Record<string, any> & { content: string };

/* ---------- Fichier ↔ objet ---------- */

export function parsePost(text: string): Post {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { content: text };
  const out: Post = { content: m[2] };
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (/^".*"$/.test(v)) { try { out[k] = JSON.parse(v); continue; } catch {} }
    if (/^'.*'$/.test(v)) out[k] = v.slice(1, -1).replace(/''/g, "'");
    else if (/^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v);
    else out[k] = v;
  }
  return out;
}

export function serializePost(post: Post): string {
  const { content, ...fm } = post;
  const lines = Object.entries(fm)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? v : JSON.stringify(String(v))}`);
  return `---\n${lines.join('\n')}\n---\n${content}`;
}

export function slugify(s: string) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 70).replace(/-+$/, '') || 'article';
}

export function newPost(): Post {
  return {
    h1: 'Titre de l’article',
    description: 'Résumé de l’article en une ou deux phrases : il s’affiche sous le titre, dans la liste du blog et dans Google.',
    date: new Date().toISOString().slice(0, 10),
    tag: 'Gestion',
    minutes: 4,
    icon: 'devis',
    color: '#DDF2F3',
    content: '\nPremier paragraphe de l’article. Cliquez ici pour écrire.\n\n## Un intertitre\n\nLe texte de cette partie.\n\n## À retenir\n\n- Un point à retenir ;\n- un autre point.\n',
  };
}

/* ---------- Markdown ↔ HTML (le texte de l'article) ---------- */

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

const inlineMd = (s: string) =>
  esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

/* ---------- Blocs prêts à remplir : tableau et encadrés ---------- */

// Styles d'encadré. Dans le fichier : « > [!conseil] Titre », puis le texte (voir src/markdown/encadres.mjs).
export const CALLOUTS: Record<string, string> = { conseil: 'Bon à savoir', attention: 'Attention', exemple: 'Exemple' };
export const calloutKind = (el: Element) => (el.className.match(/encadre-(\w+)/)?.[1] ?? 'conseil');

export const starterTable = () =>
  `<div class="table-wrap"><table><thead><tr><th>Colonne 1</th><th>Colonne 2</th><th>Colonne 3</th></tr></thead><tbody>${
    [1, 2].map((r) => `<tr><td>Ligne ${r}</td><td>…</td><td>…</td></tr>`).join('')
  }</tbody></table></div>`;
export const starterCallout = (kind: string) =>
  `<blockquote class="encadre encadre-${kind}"><p class="encadre-titre">${CALLOUTS[kind] ?? 'Bon à savoir'}</p><p>Le texte de l’encadré.</p></blockquote>`;

// Assez pour ce qu'écrivent les articles : titres, paragraphes, listes, tableaux, encadrés, gras, liens.
export function mdToHtml(md: string): string {
  const out: string[] = [];
  const blocks = md.replace(/\r/g, '').trim().split(/\n\s*\n/);
  for (const b of blocks) {
    const lines = b.split('\n');
    const h = b.match(/^(#{2,3})\s+(.*)$/);
    if (lines.every((l) => /^\s*>/.test(l))) {
      const inner = lines.map((l) => l.replace(/^\s*>\s?/, '')).join('\n').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
      const m = inner[0]?.match(/^\[!(\w+)\]\s*(.*)$/s);
      const kind = m ? m[1].toLowerCase() : 'conseil';
      if (m) inner.shift();
      const title = m ? `<p class="encadre-titre">${inlineMd(m[2] || CALLOUTS[kind] || '')}</p>` : '';
      out.push(`<blockquote class="encadre encadre-${kind}">${title}${inner.map((x) => `<p>${x.split('\n').map(inlineMd).join('<br>')}</p>`).join('')}</blockquote>`);
    } else if (h && lines.length === 1) out.push(`<h${h[1].length}>${inlineMd(h[2])}</h${h[1].length}>`);
    else if (lines.every((l) => /^\s*[-*]\s+/.test(l))) out.push(`<ul>${lines.map((l) => `<li>${inlineMd(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`);
    else if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) out.push(`<ol>${lines.map((l) => `<li>${inlineMd(l.replace(/^\s*\d+\.\s+/, ''))}</li>`).join('')}</ol>`);
    else if (lines.length >= 2 && lines.every((l) => /^\|.*\|$/.test(l.trim())) && /^\|[\s:|-]+\|$/.test(lines[1].trim())) {
      const cells = (l: string) => l.trim().slice(1, -1).split('|').map((c) => c.trim());
      out.push(`<table><thead><tr>${cells(lines[0]).map((c) => `<th>${inlineMd(c)}</th>`).join('')}</tr></thead><tbody>${lines.slice(2).map((l) => `<tr>${cells(l).map((c) => `<td>${inlineMd(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    } else out.push(`<p>${lines.map(inlineMd).join('<br>')}</p>`);
  }
  return out.join('\n');
}

function inlineFromDom(node: Node): string {
  let out = '';
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) { out += (n.nodeValue ?? '').replace(/ /g, ' ').replace(/\s*\n\s*/g, ' '); return; }
    if (n.nodeType !== 1) return;
    const el = n as HTMLElement;
    if (el.closest('.ed-ui')) return;
    const t = () => inlineFromDom(el);
    const wrap = (mark: string) => {
      const x = t();
      const m = x.match(/^(\s*)(.*?)(\s*)$/s)!;
      return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : x;
    };
    if (el.tagName === 'BR') out += '\n';
    else if (el.tagName === 'STRONG' || el.tagName === 'B') out += wrap('**');
    else if (el.tagName === 'EM' || el.tagName === 'I') out += wrap('*');
    else if (el.tagName === 'A') { const x = t(); out += x.trim() ? `[${x}](${el.getAttribute('href') ?? ''})` : x; }
    else out += t();
  });
  return out;
}
const clean = (s: string) => s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();

// Retour au Markdown à partir du texte modifié dans la page.
export function htmlToMd(root: HTMLElement): string {
  const out: string[] = [];
  const pushPara = (s: string) => { const c = clean(s); if (c) out.push(c); };
  let loose = '';
  const flush = () => { pushPara(loose); loose = ''; };
  root.childNodes.forEach((n) => {
    if (n.nodeType === 3) { loose += n.nodeValue ?? ''; return; }
    if (n.nodeType !== 1) return;
    const el = n as HTMLElement;
    if (el.classList.contains('ed-ui')) return;
    const tag = el.tagName;
    if (['STRONG', 'B', 'EM', 'I', 'A', 'SPAN'].includes(tag)) { loose += inlineFromDom({ childNodes: [el] } as any); return; }
    if (tag === 'BR') { loose += '\n'; return; }
    flush();
    if (tag === 'H1' || tag === 'H2') { const c = clean(inlineFromDom(el)).replace(/\n/g, ' '); if (c) out.push(`## ${c}`); }
    else if (/^H[3-6]$/.test(tag)) { const c = clean(inlineFromDom(el)).replace(/\n/g, ' '); if (c) out.push(`### ${c}`); }
    else if (tag === 'UL' || tag === 'OL') {
      const items = Array.from(el.children).filter((c) => c.tagName === 'LI').map((li) => clean(inlineFromDom(li)).replace(/\n/g, ' ')).filter(Boolean);
      if (items.length) out.push(items.map((x, i) => (tag === 'OL' ? `${i + 1}. ${x}` : `- ${x}`)).join('\n'));
    } else if (tag === 'TABLE') {
      const rows = Array.from(el.querySelectorAll('tr')).map((tr) => Array.from(tr.children).map((c) => clean(inlineFromDom(c)).replace(/\n/g, ' ').replace(/\|/g, '\\|')));
      if (rows.length) {
        const row = (r: string[]) => `|${r.map((c) => (c ? ` ${c} ` : ' ')).join('|')}|`;
        out.push([row(rows[0]), `|${rows[0].map(() => '---').join('|')}|`, ...rows.slice(1).map(row)].join('\n'));
      }
    } else if (tag === 'BLOCKQUOTE') {
      const kind = calloutKind(el);
      const t = el.querySelector(':scope > .encadre-titre');
      const title = t ? clean(inlineFromDom(t)).replace(/\n/g, ' ') : '';
      const paras = Array.from(el.children).filter((c) => c !== t).map((c) => clean(inlineFromDom(c))).filter(Boolean);
      const loose = clean(Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' '));
      if (loose) paras.push(loose);
      const lines = [`> [!${kind}]${title ? ` ${title}` : ''}`];
      paras.forEach((x) => lines.push('>', ...x.split('\n').map((l) => `> ${l}`)));
      out.push(lines.join('\n'));
    } else if (tag === 'DIV' && el.querySelector('p, h2, h3, ul, ol, table, blockquote')) {
      const inner = htmlToMd(el).trim();
      if (inner) out.push(inner);
    } else pushPara(inlineFromDom(el));
  });
  flush();
  return `\n${out.join('\n\n')}\n`;
}

/* ---------- Réglages d'un article (fenêtre « Réglages ») ---------- */

export const POST_SETTINGS: { key: string; label: string; type: 'text' | 'date' | 'number' | 'select' | 'textarea'; help?: string; options?: { label: string; value: string }[] }[] = [
  { key: 'h1', label: 'Titre de l’article', type: 'text' },
  { key: 'description', label: 'Résumé', type: 'textarea', help: 'Une ou deux phrases, environ 150 caractères. Affiché sous le titre, dans la liste du blog et dans Google.' },
  { key: 'tag', label: 'Thème', type: 'text', help: 'Un seul mot : Factures, Chantiers, Magasin, Devis…' },
  { key: 'date', label: 'Date de publication', type: 'date', help: 'Le blog range les articles du plus récent au plus ancien.' },
  { key: 'minutes', label: 'Temps de lecture (minutes)', type: 'number' },
  { key: 'title', label: 'Titre pour Google (facultatif)', type: 'text', help: 'Laissez vide pour reprendre le titre de l’article suivi de « | Stagnum ».' },
  { key: 'updated', label: 'Date de mise à jour (facultatif)', type: 'date' },
];
