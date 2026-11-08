// Édition directe dans la page : retrouve les textes du site dans la page affichée, les rend modifiables
// au clic, et ajoute dans la page les boutons « + » et « − » : éléments d'une liste, blocs, articles du blog.
import { computeVars, fromEditDOM, normalize, tidy, toEditHTML, toPlain, VAR_LABELS, type Vars } from './markup';
import { BLOCK_TYPES, blockLabel, cleanDescription, fieldAt, isMultiline, richness, starterBlock, type Entry, type Path } from './schema';
import { htmlToMd, mdToHtml } from './posts';
import EDIT_CSS from './inline.css?raw';

export interface Leaf { file: string; path: Path; raw: string; field: any; rank: number }
export type ListOp = { type: 'duplicate' | 'remove' | 'up' | 'down'; index: number };
export interface BlogItem { file: string; url: string; h1: string; description: string; tag: string; date: string; status: 'base' | 'new' | 'deleted' }

export interface InlineCtx {
  entries: Entry[]; // contenus de la page puis du site, par ordre de priorité
  base: Record<string, any>; // contenus enregistrés : c'est ce que la page affiche
  getFiles: () => Record<string, any>; // contenus en cours de modification
  onChange: (file: string, path: Path, value: any) => void;
  onList: (file: string, path: Path, op: ListOp) => void;
  // Ajouts et retraits faits depuis la dernière publication : rejoués dans la page à son chargement.
  replay: Record<string, { path: Path; op: ListOp }[] | null | undefined>;
  blocksFile?: string | null; // contenu dont les « blocs supplémentaires » s'affichent sur cette page
  onBlockSettings?: (file: string, index: number) => void;
  post?: { file: string; fill: boolean } | null; // page d'un article
  blog?: { items: BlogItem[]; onAdd: () => void; onRemove: (file: string) => void; onOpen: (file: string) => void } | null; // page du blog
  onError?: (message: string) => void;
}

const key = (file: string, path: Path) => `${file}::${JSON.stringify(path)}`;
const SKIP = new Set(['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'TEMPLATE', 'SELECT', 'OPTION', 'TEXTAREA', 'INPUT', 'IFRAME', 'svg']);
const INLINE_OK = (el: Element) =>
  el.tagName === 'BR' || el.tagName === 'STRONG' || el.tagName === 'B' || el.tagName === 'EM' || el.tagName === 'A' ||
  (el.tagName === 'SPAN' && (el.classList.contains('hl') || !el.children.length));
const WRAP_TAGS = new Set(['A', 'BUTTON', 'LABEL', 'SUMMARY']);
const PARAS = /\n\s*\n/;

// Tous les textes des contenus, avec leur chemin.
export function collectLeaves(entries: Entry[], files: Record<string, any>, keep: (path: Path) => boolean = () => true): Leaf[] {
  const out: Leaf[] = [];
  entries.forEach((e, rank) => {
    const walk = (v: any, path: Path) => {
      if (typeof v === 'string') {
        const field = fieldAt(e.schema, path, files[e.id]);
        if (field && field.kind === 'form' && !field.options && v.trim() && keep(path)) out.push({ file: e.id, path, raw: v, field, rank });
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i]));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
    };
    walk(files[e.id], []);
  });
  return out;
}

export function attachInline(doc: Document, ctx: InlineCtx) {
  const win = doc.defaultView!;
  const vars: Vars = computeVars(ctx.getFiles());
  const files0 = ctx.getFiles();
  const style = doc.createElement('style');
  style.textContent = EDIT_CSS;
  doc.head.appendChild(style);
  doc.documentElement.classList.add('ed-on');
  try { doc.execCommand('defaultParagraphSeparator', false, 'p'); } catch {}

  // La page affiche les contenus enregistrés. Si on a ajouté ou retiré des éléments depuis, on rejoue ces
  // changements dans la page ; les blocs, eux, sont redessinés à partir des contenus modifiés.
  const noBlocks = (v: any) => (v && typeof v === 'object' && !Array.isArray(v) ? { ...v, blocks: undefined } : v);
  const same = (id: string) => sameShape(noBlocks(ctx.base[id]), noBlocks(files0[id]));
  const shaped = new Set(ctx.entries.map((e) => e.id).filter((id) => same(id) || Array.isArray(ctx.replay[id])));
  const skipped = new Set(ctx.entries.map((e) => e.id).filter((id) => !shaped.has(id)));

  const targets: HTMLElement[] = [];
  const owned = new WeakSet<Element>();
  const meta = new WeakMap<HTMLElement, { file: string; path: Path; seg?: number; field: any }>();

  /* ---------- Retrouver les textes dans la page ---------- */

  // Rend modifiables les éléments d'une zone dont le texte correspond à un des textes donnés.
  // consume : deux éléments au même texte vont à deux textes différents (ex. deux cartes identiques).
  const bindRegion = (root: Element, leaves: Leaf[], consume: boolean, skipSel?: string) => {
    const byText = new Map<string, { leaf: Leaf; seg?: number }[]>();
    const add = (t: string, v: { leaf: Leaf; seg?: number }) => {
      const n = normalize(t);
      if (n.length < 2) return;
      if (!byText.has(n)) byText.set(n, []);
      byText.get(n)!.push(v);
    };
    for (const leaf of leaves) {
      add(toPlain(leaf.raw, vars), { leaf });
      const parts = leaf.raw.split(PARAS);
      if (parts.length > 1) parts.forEach((p, i) => add(toPlain(p, vars), { leaf, seg: i }));
    }
    for (const list of byText.values()) list.sort((a, b) => a.leaf.rank - b.leaf.rank);
    const used = new Set<string>();
    const bound: HTMLElement[] = [];
    const visit = (el: Element): boolean => {
      if (SKIP.has(el.tagName) || el.closest('.ed-ui') || (skipSel && el.matches(skipSel))) return false;
      let childMatched = false;
      for (const c of Array.from(el.children)) if (visit(c)) childMatched = true;
      if (childMatched) return true;
      const text = normalize(el.textContent ?? '');
      const found = byText.get(text);
      if (!found) return false;
      const id = (f: { leaf: Leaf; seg?: number }) => `${key(f.leaf.file, f.leaf.path)}#${f.seg ?? ''}`;
      const pick = consume ? found.find((f) => !used.has(id(f))) ?? found[0] : found[0];
      const target = prepare(el as HTMLElement, text);
      if (!target) return false;
      used.add(id(pick));
      bind(target, pick.leaf, pick.seg);
      bound.push(target);
      return true;
    };
    visit(root);
    return bound;
  };

  // Rend un élément modifiable sans toucher aux icônes ni aux éléments décoratifs qui l'entourent.
  const prepare = (el: HTMLElement, text: string): HTMLElement | null => {
    if (owned.has(el)) return null;
    const plainInside = Array.from(el.children).every(INLINE_OK);
    if (plainInside && !WRAP_TAGS.has(el.tagName)) return el;
    // Texte mêlé à des icônes : on isole le texte dans un <span>.
    const nodes = Array.from(el.childNodes).filter((n) => n.nodeType === 3 || (n.nodeType === 1 && INLINE_OK(n as Element)));
    if (normalize(nodes.map((n) => n.textContent).join('')) !== text) return null;
    const first = nodes.findIndex((n) => normalize(n.textContent ?? ''));
    const last = nodes.length - 1 - [...nodes].reverse().findIndex((n) => normalize(n.textContent ?? ''));
    const run = nodes.slice(first, last + 1);
    const all = Array.from(el.childNodes);
    if (all.indexOf(run[run.length - 1]) - all.indexOf(run[0]) !== run.length - 1) return null; // texte coupé par une icône
    const span = doc.createElement('span');
    span.className = 'ed-wrap';
    el.insertBefore(span, run[0]);
    run.forEach((n) => span.appendChild(n));
    return span;
  };

  const show = (el: HTMLElement, raw: string, seg?: number) => {
    el.innerHTML = toEditHTML(seg === undefined ? raw : raw.split(PARAS)[seg] ?? '', vars, el.querySelector('.hl')?.className ?? 'hl');
  };

  const bind = (el: HTMLElement, leaf: Leaf, seg?: number) => {
    owned.add(el);
    const draft = getAt(ctx.getFiles()[leaf.file], leaf.path);
    show(el, typeof draft === 'string' ? draft : leaf.raw, seg);
    el.contentEditable = 'true';
    el.spellcheck = true;
    el.dataset.ed = key(leaf.file, leaf.path);
    meta.set(el, { file: leaf.file, path: leaf.path, seg, field: leaf.field });
    targets.push(el);
  };

  /* ---------- Listes : repérer les éléments ---------- */

  type Item = { el: HTMLElement; index: number };
  type List = { file: string; path: Path; items: Item[] };
  const lists = new Map<string, List>();
  const entryOf = (file: string) => ctx.entries.find((e) => e.id === file);

  const arrayOf = (file: string, path: Path) => {
    const entry = entryOf(file);
    if (!entry) return null;
    for (let i = path.length - 1; i > 0; i--) {
      if (typeof path[i] !== 'number') continue;
      const parent = path.slice(0, i);
      const f = fieldAt(entry.schema, parent, ctx.getFiles()[file]);
      if (f?.kind === 'array' && f.element?.kind !== 'conditional') return { arr: parent, index: path[i] as number };
    }
    return null;
  };

  const lca = (a: Element, b: Element) => {
    const anc = new Set<Element>();
    for (let x: Element | null = a; x; x = x.parentElement) anc.add(x);
    for (let x: Element | null = b; x; x = x.parentElement) if (anc.has(x)) return x;
    return null;
  };

  // lengthOf : longueur de la liste dans les contenus que la page affiche.
  const buildLists = (bound: HTMLElement[], from: Record<string, any>) => {
    const groups = new Map<string, { file: string; arr: Path; byIndex: Map<number, HTMLElement[]> }>();
    for (const el of bound) {
      const m = meta.get(el)!;
      const a = arrayOf(m.file, m.path);
      if (!a) continue;
      const k = key(m.file, a.arr);
      if (!groups.has(k)) groups.set(k, { file: m.file, arr: a.arr, byIndex: new Map() });
      const g = groups.get(k)!;
      if (!g.byIndex.has(a.index)) g.byIndex.set(a.index, []);
      g.byIndex.get(a.index)!.push(el);
    }
    for (const [k, g] of groups) {
      const indexes = [...g.byIndex.keys()].sort((a, b) => a - b);
      const firstOf = (i: number) => g.byIndex.get(i)![0];
      const container = indexes.length >= 2 ? lca(firstOf(indexes[0]), firstOf(indexes[1])) : null;
      const itemOf = (el: Element): HTMLElement | null => {
        if (container) {
          let x: Element | null = el;
          while (x && x.parentElement !== container) x = x.parentElement;
          return x as HTMLElement | null;
        }
        // Un seul élément trouvé : on remonte jusqu'à un élément qui a des frères du même type.
        let x: Element | null = el;
        while (x && x.parentElement && x !== doc.body) {
          const same = Array.from(x.parentElement.children).filter((s) => s.tagName === x!.tagName);
          if (same.length >= 2) return x as HTMLElement;
          x = x.parentElement;
        }
        return null;
      };
      const items: Item[] = [];
      for (const i of indexes) {
        const it = itemOf(firstOf(i));
        if (!it || items.some((x) => x.el === it) || it === doc.body) continue;
        // Tous les textes de l'élément doivent appartenir au même élément de la liste.
        if (g.byIndex.get(i)!.some((el) => !it.contains(el))) continue;
        items.push({ el: it, index: i });
      }
      // On ne propose la liste que si chaque élément trouvé est bien séparé des autres, et que la page l'affiche en entier.
      if (!items.length || (container && items.length !== indexes.length)) continue;
      if (items.length !== (getAt(from[g.file], g.arr)?.length ?? 0)) continue;
      lists.set(k, { file: g.file, path: g.arr, items });
      items.forEach((it) => { it.el.dataset.edItem = k; });
    }
  };

  // Textes modifiables d'un élément de liste (l'élément lui-même peut en être un).
  const edsIn = (el: HTMLElement) => [...(el.matches('[data-ed]') ? [el] : []), ...el.querySelectorAll<HTMLElement>('[data-ed]')];

  // Met à jour les chemins des textes après un changement d'ordre.
  const reindex = (list: List) => {
    const depth = list.path.length;
    list.items.forEach((it, i) => {
      it.index = i;
      edsIn(it.el).forEach((el) => {
        const m = meta.get(el);
        if (!m) return;
        m.path = [...m.path.slice(0, depth), i, ...m.path.slice(depth + 1)];
        el.dataset.ed = key(m.file, m.path);
      });
    });
  };

  // Applique dans la page un ajout, un retrait ou un déplacement. Renvoie le nouvel élément s'il y en a un.
  const applyOp = (list: List, pos: number, type: ListOp['type']): HTMLElement | null => {
    const it = list.items[pos];
    if (type === 'duplicate') {
      const copy = it.el.cloneNode(true) as HTMLElement;
      it.el.after(copy);
      const origs = edsIn(it.el);
      edsIn(copy).forEach((c, n) => {
        const m = origs[n] && meta.get(origs[n]);
        if (m) { meta.set(c, { ...m, path: [...m.path] }); targets.push(c); owned.add(c); }
      });
      list.items.splice(pos + 1, 0, { el: copy, index: pos + 1 });
      reindex(list);
      return copy;
    }
    if (type === 'remove') {
      it.el.remove();
      list.items.splice(pos, 1);
      reindex(list);
      return null;
    }
    const to = type === 'up' ? pos - 1 : pos + 1;
    const other = list.items[to];
    if (type === 'up') other.el.before(it.el);
    else other.el.after(it.el);
    [list.items[pos], list.items[to]] = [list.items[to], list.items[pos]];
    reindex(list);
    return null;
  };

  const refreshTexts = (file: string) => {
    for (const el of targets) {
      const m = meta.get(el);
      if (!m || m.file !== file || !el.isConnected) continue;
      const v = getAt(ctx.getFiles()[file], m.path);
      if (typeof v === 'string') show(el, v, m.seg);
    }
  };

  /* ---------- Page d'un article ---------- */

  const post = ctx.post ? setupPostPage(ctx.post.file, ctx.post.fill) : null;

  /* ---------- Textes de la page ---------- */

  const leaves = collectLeaves(ctx.entries.filter((e) => shaped.has(e.id)), ctx.base, (p) => p[0] !== 'blocks');
  const pageBound = bindRegion(doc.body, leaves, false, '[data-ed-blocks], .article-body');
  buildLists(pageBound, ctx.base);

  // Rejoue les ajouts et retraits faits depuis la dernière publication.
  for (const id of shaped) {
    if (same(id)) continue;
    let ok = true;
    for (const { path, op } of ctx.replay[id] ?? []) {
      const list = lists.get(key(id, path));
      if (!list || !list.items[op.index] || (op.type === 'up' && op.index === 0) || (op.type === 'down' && op.index >= list.items.length - 1)) { ok = false; break; }
      applyOp(list, op.index, op.type);
    }
    for (const l of lists.values()) if (l.file === id && l.items.length !== (getAt(files0[id], l.path)?.length ?? 0)) ok = false;
    if (ok) refreshTexts(id);
    else {
      skipped.add(id);
      for (const el of targets) if (meta.get(el)?.file === id) { el.contentEditable = 'false'; delete el.dataset.ed; }
      for (const [k, l] of lists) if (l.file === id) { l.items.forEach((it) => delete it.el.dataset.edItem); lists.delete(k); }
    }
  }

  /* ---------- Barres d'outils au survol ---------- */

  const makeBar = (cls: string, html: string) => {
    const b = doc.createElement('div');
    b.className = `ed-ui ed-bar ${cls}`;
    b.innerHTML = html;
    doc.body.appendChild(b);
    return b;
  };
  const placeAt = (bar: HTMLElement, r: DOMRect, where: 'right' | 'left') => {
    bar.style.top = `${Math.max(r.top + win.scrollY - 16, win.scrollY + 4)}px`;
    bar.style.left = where === 'right'
      ? `${Math.max(8, Math.min(r.right + win.scrollX - bar.offsetWidth - 8, win.innerWidth - bar.offsetWidth - 8))}px`
      : `${Math.max(8, r.left + win.scrollX + 12)}px`;
    bar.classList.add('show');
  };
  const rectOf = (el: HTMLElement) => {
    // Les repères des blocs n'ont pas de boîte (display: contents) : on prend leur contenu.
    if (getComputedStyle(el).display !== 'contents') return el.getBoundingClientRect();
    const kids = Array.from(el.children) as HTMLElement[];
    const rs = kids.map((k) => k.getBoundingClientRect()).filter((r) => r.width || r.height);
    if (!rs.length) return el.getBoundingClientRect();
    const top = Math.min(...rs.map((r) => r.top)), left = Math.min(...rs.map((r) => r.left));
    const right = Math.max(...rs.map((r) => r.right)), bottom = Math.max(...rs.map((r) => r.bottom));
    return new DOMRect(left, top, right - left, bottom - top);
  };

  // Élément d'une liste : + ajoute un élément juste après, − le retire.
  const itemBar = makeBar('ed-itembar', `
    <button type="button" data-op="up" title="Monter">↑</button>
    <button type="button" data-op="down" title="Descendre">↓</button>
    <button type="button" data-op="duplicate" class="ed-plus" title="Ajouter un élément après celui-ci">+</button>
    <button type="button" data-op="remove" class="ed-minus" title="Retirer cet élément">−</button>`);
  let barItem: HTMLElement | null = null;
  const placeItemBar = (it: HTMLElement) => {
    const list = lists.get(it.dataset.edItem!);
    if (!list) return;
    barItem = it;
    placeAt(itemBar, it.getBoundingClientRect(), 'right');
    const pos = list.items.findIndex((x) => x.el === it);
    (itemBar.querySelector('[data-op=up]') as HTMLButtonElement).disabled = pos === 0;
    (itemBar.querySelector('[data-op=down]') as HTMLButtonElement).disabled = pos === list.items.length - 1;
    (itemBar.querySelector('[data-op=remove]') as HTMLButtonElement).disabled = list.items.length <= 1;
  };

  const onItemBar = (e: MouseEvent) => {
    const btn = (e.target as Element).closest('button[data-op]') as HTMLButtonElement | null;
    if (!btn || !barItem) return;
    e.preventDefault();
    const list = lists.get(barItem.dataset.edItem!);
    if (!list) return;
    const pos = list.items.findIndex((x) => x.el === barItem);
    const type = btn.dataset.op as ListOp['type'];
    if (pos < 0) return;
    // Liste dans un bloc : le bloc est redessiné à partir des contenus.
    if (list.path[0] === 'blocks' && list.file === ctx.blocksFile) {
      ctx.onList(list.file, list.path, { type, index: pos });
      itemBar.classList.remove('show');
      refreshBlocks({ focus: type === 'duplicate' ? [...list.path, pos + 1] : undefined });
      return;
    }
    const copy = applyOp(list, pos, type);
    ctx.onList(list.file, list.path, { type, index: pos });
    if (copy) {
      copy.classList.add('ed-new');
      const first = edsIn(copy)[0];
      if (first) { first.focus(); selectAll(first); showTools(first); }
      placeItemBar(copy);
    } else if (type === 'remove') itemBar.classList.remove('show');
    else placeItemBar(list.items[type === 'up' ? pos - 1 : pos + 1].el);
  };

  /* ---------- Blocs supplémentaires ---------- */

  const region = ctx.blocksFile ? doc.querySelector<HTMLElement>('[data-ed-blocks]') : null;
  const blocksOf = () => [...((getAt(ctx.getFiles()[ctx.blocksFile!], ['blocks']) ?? []) as any[])];
  const blockBar = makeBar('ed-blockbar', `
    <span class="ed-bar-label"></span>
    <button type="button" data-b="up" title="Monter le bloc">↑</button>
    <button type="button" data-b="down" title="Descendre le bloc">↓</button>
    <button type="button" data-b="settings" title="Couleur de fond, icônes, liens…">Réglages</button>
    <button type="button" data-b="add" class="ed-plus" title="Ajouter un bloc après celui-ci">+</button>
    <button type="button" data-b="remove" class="ed-minus" title="Retirer ce bloc">−</button>`);
  let barBlock: HTMLElement | null = null;
  const placeBlockBar = (w: HTMLElement) => {
    barBlock = w;
    const i = Number(w.dataset.edBlock);
    const n = blocksOf().length;
    blockBar.querySelector('.ed-bar-label')!.textContent = blockLabel(blocksOf()[i]?.discriminant);
    (blockBar.querySelector('[data-b=up]') as HTMLButtonElement).disabled = i === 0;
    (blockBar.querySelector('[data-b=down]') as HTMLButtonElement).disabled = i >= n - 1;
    placeAt(blockBar, rectOf(w), 'left');
  };

  // Choix du type d'un nouveau bloc.
  const menu = doc.createElement('div');
  menu.className = 'ed-ui ed-menu';
  menu.innerHTML = `<p>Quel bloc ajouter ?</p>${BLOCK_TYPES.map((t) => `<button type="button" data-type="${t.value}"><strong>${t.label.split(' :')[0]}</strong>${t.label.includes(' :') ? `<span>${t.label.split(' :')[1].trim().replace(/^./, (c) => c.toUpperCase())}</span>` : ''}</button>`).join('')}`;
  doc.body.appendChild(menu);
  let menuAt = 0;
  const openMenu = (anchor: Element, at: number) => {
    menuAt = at;
    const r = anchor.getBoundingClientRect();
    menu.classList.add('show');
    // Sous le bouton, ou au-dessus s'il n'y a pas la place.
    const below = r.bottom + 8 + menu.offsetHeight <= win.innerHeight || r.top - 8 - menu.offsetHeight < 0;
    menu.style.top = `${(below ? r.bottom + 8 : r.top - 8 - menu.offsetHeight) + win.scrollY}px`;
    menu.style.left = `${Math.max(8, Math.min(r.left + win.scrollX + r.width / 2 - menu.offsetWidth / 2, win.innerWidth - menu.offsetWidth - 8))}px`;
  };
  menu.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button[data-type]') as HTMLElement | null;
    if (!b) return;
    menu.classList.remove('show');
    const arr = blocksOf();
    arr.splice(menuAt, 0, starterBlock(b.dataset.type!));
    ctx.onChange(ctx.blocksFile!, ['blocks'], arr);
    refreshBlocks({ reveal: menuAt });
  });

  const onBlockBar = (e: MouseEvent) => {
    const btn = (e.target as Element).closest('button[data-b]') as HTMLButtonElement | null;
    if (!btn || !barBlock) return;
    e.preventDefault();
    const i = Number(barBlock.dataset.edBlock);
    const op = btn.dataset.b;
    const arr = blocksOf();
    if (op === 'settings') { ctx.onBlockSettings?.(ctx.blocksFile!, i); return; }
    if (op === 'add') { openMenu(btn, i + 1); return; }
    if (op === 'remove') {
      if (!win.confirm(`Retirer le bloc « ${blockLabel(arr[i]?.discriminant)} » ?`)) return;
      arr.splice(i, 1);
      blockBar.classList.remove('show');
      ctx.onChange(ctx.blocksFile!, ['blocks'], arr);
      refreshBlocks({});
      return;
    }
    const to = op === 'up' ? i - 1 : i + 1;
    if (to < 0 || to >= arr.length) return;
    [arr[i], arr[to]] = [arr[to], arr[i]];
    ctx.onChange(ctx.blocksFile!, ['blocks'], arr);
    refreshBlocks({ reveal: to });
  };

  // « + Ajouter un bloc » sous les blocs de la page.
  if (region) {
    const row = doc.createElement('div');
    row.className = 'ed-ui ed-inflow ed-addblock';
    row.innerHTML = '<button type="button"><span>+</span> Ajouter un bloc</button>';
    region.after(row);
    row.querySelector('button')!.addEventListener('click', (e) => openMenu(e.currentTarget as Element, blocksOf().length));
  }

  const bindBlocks = () => {
    if (!region || !ctx.blocksFile) return;
    const entry = entryOf(ctx.blocksFile);
    if (!entry) return;
    for (const k of [...lists.keys()]) if (k.startsWith(`${ctx.blocksFile}::["blocks"`)) lists.delete(k);
    for (let i = targets.length - 1; i >= 0; i--) if (!targets[i].isConnected) targets.splice(i, 1);
    region.querySelectorAll<HTMLElement>(':scope > [data-ed-block]').forEach((w) => {
      const i = Number(w.dataset.edBlock);
      const ls = collectLeaves([entry], ctx.getFiles(), (p) => p[0] === 'blocks' && p[1] === i);
      buildLists(bindRegion(w, ls, true), ctx.getFiles());
    });
  };

  // Redessine les blocs à partir des contenus modifiés, avec le rendu du site.
  let seq = 0;
  const refreshBlocks = async (opts: { focus?: Path; reveal?: number } = {}) => {
    if (!region) return;
    const my = ++seq;
    let html = '';
    try {
      const res = await win.fetch('/api/edition/blocs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ blocks: blocksOf() }) });
      if (!res.ok) throw new Error(String(res.status));
      html = await res.text();
    } catch {
      ctx.onError?.('Les blocs n’ont pas pu être affichés. Vos modifications sont gardées : elles apparaîtront après publication.');
      return;
    }
    if (my !== seq) return;
    const tmp = doc.createElement('div');
    tmp.innerHTML = html;
    const fresh = tmp.querySelector('[data-ed-blocks]');
    if (!fresh) return;
    region.replaceChildren(...Array.from(fresh.childNodes));
    region.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    blockBar.classList.remove('show');
    itemBar.classList.remove('show');
    bindBlocks();
    if (opts.focus) {
      const f = JSON.stringify(opts.focus).slice(0, -1);
      const el = targets.find((t) => t.isConnected && JSON.stringify(meta.get(t)!.path).startsWith(f));
      if (el) { el.focus(); selectAll(el); showTools(el); }
    }
    if (opts.reveal !== undefined) {
      const w = region.querySelector<HTMLElement>(`:scope > [data-ed-block="${opts.reveal}"]`);
      const first = w?.firstElementChild as HTMLElement | null;
      if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.classList.add('ed-new'); }
    }
  };

  if (region && ctx.blocksFile) {
    const changed = JSON.stringify(getAt(ctx.base[ctx.blocksFile], ['blocks']) ?? []) !== JSON.stringify(blocksOf());
    if (changed) refreshBlocks();
    else bindBlocks();
  }

  let blocksTimer = 0;
  const blocksChanged = () => { win.clearTimeout(blocksTimer); blocksTimer = win.setTimeout(() => refreshBlocks(), 350); };

  /* ---------- Blog : + Nouvel article, − Supprimer ---------- */

  const postBar = makeBar('ed-postbar', '<button type="button" data-p="remove" class="ed-minus-label" title="Supprimer cet article">− Supprimer l’article</button>');
  let barPost: HTMLElement | null = null;
  if (ctx.blog) setupBlog(ctx.blog);

  function setupBlog(blog: NonNullable<InlineCtx['blog']>) {
    const wrap = doc.querySelector('.list-section .wrap');
    if (!wrap) return;
    const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } };
    wrap.querySelectorAll<HTMLAnchorElement>('a.lead-post, .rows li > a').forEach((a) => {
      const it = blog.items.find((i) => i.url === new URL(a.href, win.location.href).pathname);
      if (!it) return;
      const el = (a.classList.contains('lead-post') ? a : a.closest('li')) as HTMLElement;
      el.dataset.edPost = it.file;
      if (it.status === 'deleted') el.remove();
    });
    const rows = wrap.querySelector('.rows');
    const proto = rows?.querySelector('li');
    for (const it of blog.items.filter((i) => i.status === 'new')) {
      if (!rows || !proto) break;
      const li = proto.cloneNode(true) as HTMLElement;
      const set = (sel: string, t: string) => { const x = li.querySelector(sel); if (x) x.textContent = t; };
      set('.tag', it.tag); set('time', fmtDate(it.date)); set('h3', it.h1); set('.excerpt', it.description);
      li.querySelector('a')?.setAttribute('href', '#');
      li.dataset.edPost = it.file;
      li.dataset.edNewPost = '';
      li.classList.add('ed-new');
      rows.prepend(li);
    }
    const row = doc.createElement('div');
    row.className = 'ed-ui ed-inflow ed-addpost';
    row.innerHTML = '<button type="button"><span>+</span> Nouvel article</button>';
    wrap.prepend(row);
    row.querySelector('button')!.addEventListener('click', () => blog.onAdd());
    postBar.addEventListener('click', (e) => {
      if (!(e.target as Element).closest('[data-p=remove]') || !barPost) return;
      e.preventDefault();
      const file = barPost.dataset.edPost!;
      const title = blog.items.find((i) => i.file === file)?.h1 ?? '';
      if (!win.confirm(`Supprimer l’article « ${title} » ?\nIl sera retiré du site à la publication.`)) return;
      barPost.remove();
      postBar.classList.remove('show');
      blog.onRemove(file);
    });
  }

  /* ---------- Saisie ---------- */

  const selectAll = (el: HTMLElement) => {
    const r = doc.createRange();
    r.selectNodeContents(el);
    const s = win.getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
  };

  const fullRaw = (el: HTMLElement) => {
    const m = meta.get(el)!;
    const value = tidy(fromEditDOM(el));
    if (m.seg === undefined) return value;
    const current = getAt(ctx.getFiles()[m.file], m.path) as string;
    const parts = current.split(PARAS);
    parts[m.seg] = value;
    return parts.join('\n\n');
  };

  const onInput = (e: Event) => {
    const el = (e.target as Element).closest?.('[data-ed]') as HTMLElement | null;
    if (!el) return;
    const m = meta.get(el);
    if (!m) return;
    const raw = fullRaw(el);
    ctx.onChange(m.file, m.path, raw);
    // Même texte affiché ailleurs dans la page (ex. un bouton répété) : on le met à jour aussi.
    for (const other of targets) {
      if (other === el || other.dataset.ed !== el.dataset.ed || !other.isConnected) continue;
      show(other, raw, meta.get(other)!.seg);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    const el = (e.target as Element).closest?.('[data-ed]') as HTMLElement | null;
    if (!el) return;
    const m = meta.get(el);
    if (!m) return;
    if (e.key === 'Enter' && !(isMultiline(m.field) && m.seg === undefined && e.shiftKey)) {
      e.preventDefault();
      if (!isMultiline(m.field) || m.seg !== undefined) el.blur();
    }
    if (e.key === 'Escape') el.blur();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); format('bold'); }
  };

  const onPaste = (e: ClipboardEvent) => {
    const t = e.target as Element;
    if (!t.closest?.('[data-ed], .ed-body')) return;
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    doc.execCommand('insertText', false, t.closest('.ed-body') ? text : text.replace(/\s*\n\s*/g, ' '));
  };

  // Les liens et boutons ne s'ouvrent pas pendant qu'on modifie leur texte.
  const onClick = (e: MouseEvent) => {
    const t = e.target as Element;
    if (!t.closest('.ed-menu')) menu.classList.remove('show');
    if (t.closest('.ed-ui')) return;
    if (t.closest('[data-ed], .ed-body')) { e.preventDefault(); return; }
    const np = t.closest('[data-ed-new-post]') as HTMLElement | null;
    if (np && ctx.blog) { e.preventDefault(); ctx.blog.onOpen(np.dataset.edPost!); return; }
    if (t.closest('[data-ed-block] a[href]')) { e.preventDefault(); return; }
    const a = t.closest('a[href]') as HTMLAnchorElement | null;
    if (a && (a.target === '_blank' || new URL(a.href, win.location.href).origin !== win.location.origin)) e.preventDefault();
  };

  const onOver = (e: MouseEvent) => {
    const t = e.target as Element;
    if (t.closest('.ed-bar, .ed-menu')) return;
    const it = t.closest('[data-ed-item]') as HTMLElement | null;
    if (it && lists.has(it.dataset.edItem!)) placeItemBar(it);
    else if (!itemBar.matches(':hover')) itemBar.classList.remove('show');
    const bl = t.closest('[data-ed-block]') as HTMLElement | null;
    if (bl && region?.contains(bl)) placeBlockBar(bl);
    else if (!blockBar.matches(':hover')) blockBar.classList.remove('show');
    const po = t.closest('[data-ed-post]') as HTMLElement | null;
    if (po) { barPost = po; placeAt(postBar, po.getBoundingClientRect(), 'right'); }
    else if (!postBar.matches(':hover')) postBar.classList.remove('show');
  };

  /* ---------- Barre de mise en forme d'un texte ---------- */

  const tools = doc.createElement('div');
  tools.className = 'ed-ui ed-tools';
  doc.body.appendChild(tools);
  let active: HTMLElement | null = null;

  function showTools(el: HTMLElement) {
    active = el;
    const m = meta.get(el)!;
    const rich = richness(m.field);
    const hasHl = !!el.querySelector('.hl, [data-ed-hl]');
    const hasLink = !!el.querySelector('a');
    const hasBold = !!el.querySelector('strong');
    const varsHere = rich.vars || !!el.querySelector('[data-var]');
    const label = m.field?.label ?? '';
    const help = cleanDescription(m.field?.description);
    tools.innerHTML = `
      <span class="ed-tools-label" title="${help.replace(/"/g, '&quot;')}">${label}</span>
      ${rich.hl || hasHl ? '<button type="button" data-f="hl" title="Surligner la sélection"><span class="ed-hl-ico">Surligner</span></button>' : ''}
      ${hasBold ? '<button type="button" data-f="bold" title="Gras"><b>G</b></button>' : ''}
      ${rich.link || hasLink ? '<button type="button" data-f="link" title="Lien">Lien</button>' : ''}
      ${varsHere ? `<select data-f="var" title="Insérer une valeur automatique"><option value="">Insérer…</option>${Object.entries(VAR_LABELS).map(([k, l]) => `<option value="${k}">${l} (${vars[k]})</option>`).join('')}</select>` : ''}`;
    const r = el.getBoundingClientRect();
    tools.style.top = `${r.top + win.scrollY - tools.offsetHeight - 10}px`;
    tools.style.left = `${Math.max(8, Math.min(r.left + win.scrollX, win.innerWidth - tools.offsetWidth - 8))}px`;
    tools.classList.add('show');
  }

  const format = (kind: string, value?: string) => {
    const el = active;
    if (!el) return;
    el.focus();
    const sel = win.getSelection()!;
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    const wrapIn = (tag: string, attrs: Record<string, string>) => {
      const host = (range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer as Element : range.commonAncestorContainer.parentElement)!;
      const existing = host.closest(kind === 'hl' ? '.hl, [data-ed-hl]' : kind === 'bold' ? 'strong' : 'a');
      if (existing && el.contains(existing) && existing !== el) {
        existing.replaceWith(...Array.from(existing.childNodes)); // déjà mis en forme : on retire
      } else if (!range.collapsed) {
        const w = doc.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => w.setAttribute(k, v));
        w.appendChild(range.extractContents());
        range.insertNode(w);
      }
    };
    if (kind === 'hl') wrapIn('span', { class: el.querySelector('.hl')?.className ?? 'hl', 'data-ed-hl': '' });
    if (kind === 'bold') wrapIn('strong', {});
    if (kind === 'link') {
      const current = (range.commonAncestorContainer.parentElement?.closest('a') as HTMLAnchorElement | null)?.getAttribute('href') ?? '/';
      const href = win.prompt('Adresse du lien (par exemple /tarifs/)', current);
      if (href === null) return;
      if (href === '') wrapIn('a', {});
      else wrapIn('a', { href, 'data-ed-link': '' });
    }
    if (kind === 'var' && value) {
      const chip = doc.createElement('span');
      chip.className = 'ed-var';
      chip.contentEditable = 'false';
      chip.dataset.var = value;
      chip.textContent = vars[value];
      range.deleteContents();
      range.insertNode(chip);
      range.setStartAfter(chip);
    }
    el.normalize();
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const onToolDown = (e: MouseEvent) => {
    const b = (e.target as Element).closest('button[data-f]') as HTMLElement | null;
    if (!b) return;
    e.preventDefault(); // garde la sélection dans le texte
    format(b.dataset.f!);
  };
  const onToolChange = (e: Event) => {
    const s = e.target as HTMLSelectElement;
    if (s.dataset.f === 'var' && s.value) { format('var', s.value); s.value = ''; }
  };

  const onFocusIn = (e: FocusEvent) => {
    const el = (e.target as Element).closest?.('[data-ed]') as HTMLElement | null;
    if (el && meta.has(el)) showTools(el);
  };
  const onFocusOut = (e: FocusEvent) => {
    const to = e.relatedTarget as Element | null;
    if (to && to.closest?.('.ed-tools')) return;
    win.setTimeout(() => {
      if (!doc.activeElement?.closest?.('[data-ed], .ed-tools')) { tools.classList.remove('show'); active = null; }
    }, 150);
  };

  /* ---------- Article : titre, résumé, thème et texte modifiables ---------- */

  function setupPostPage(file: string, fill: boolean) {
    const p = ctx.getFiles()[file];
    if (!p) return null;
    const hero = doc.querySelector('.page-hero');
    const h1 = hero?.querySelector<HTMLElement>('h1');
    const lead = hero?.querySelector<HTMLElement>('p.lead');
    const tag = doc.querySelector<HTMLElement>('.a-tag');
    const body = doc.querySelector<HTMLElement>('article.article-body');
    if (fill) {
      const time = doc.querySelector('.a-meta time');
      if (time) { try { time.textContent = new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch {} }
      const minutes = doc.querySelectorAll('.a-meta > span')[1];
      const txt = minutes && Array.from(minutes.childNodes).reverse().find((n) => n.nodeType === 3 && n.nodeValue?.trim());
      if (txt) txt.nodeValue = txt.nodeValue!.replace(/\d+/, String(p.minutes ?? ''));
      if (body) body.innerHTML = mdToHtml(p.content ?? '');
    }
    const field = (label: string, multiline = false) => ({ kind: 'form', label, multiline });
    const bindOne = (el: HTMLElement | null | undefined, k: string, label: string, multiline = false) => {
      if (!el) return;
      bind(el, { file, path: [k], raw: String(p[k] ?? ''), field: field(label, multiline), rank: 0 });
    };
    bindOne(h1, 'h1', 'Titre de l’article');
    bindOne(lead, 'description', 'Résumé (aussi affiché dans Google)', true);
    bindOne(tag, 'tag', 'Thème');
    if (!body) return null;
    body.contentEditable = 'true';
    body.spellcheck = true;
    body.classList.add('ed-body');
    // Sommaire « Dans cet article » : suit les intertitres du texte.
    const toc = doc.querySelector('.toc ol');
    const syncToc = () => {
      if (!toc) return;
      const hs = Array.from(body.querySelectorAll('h2')).map((h) => h.textContent?.trim()).filter(Boolean) as string[];
      toc.innerHTML = hs.map((t) => `<li><a>${t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</a></li>`).join('');
    };
    if (fill) syncToc();
    let timer = 0;
    const emit = () => { win.clearTimeout(timer); ctx.onChange(file, ['content'], htmlToMd(body)); syncToc(); };
    body.addEventListener('input', () => { win.clearTimeout(timer); timer = win.setTimeout(emit, 250); });
    body.addEventListener('blur', emit);

    // Barre de mise en forme du texte de l'article, en bas de l'écran.
    const bar = doc.createElement('div');
    bar.className = 'ed-ui ed-bodytools';
    bar.innerHTML = `
      <span class="ed-tools-label">Texte de l’article</span>
      <button type="button" data-c="h2" title="Grand intertitre (apparaît dans le sommaire)">Intertitre</button>
      <button type="button" data-c="h3" title="Petit intertitre">Sous-titre</button>
      <button type="button" data-c="p" title="Paragraphe normal">Texte</button>
      <button type="button" data-c="ul" title="Liste à puces">• Liste</button>
      <button type="button" data-c="ol" title="Liste numérotée">1. Liste</button>
      <button type="button" data-c="bold" title="Gras"><b>G</b></button>
      <button type="button" data-c="link" title="Lien">Lien</button>`;
    doc.body.appendChild(bar);
    bar.addEventListener('mousedown', (e) => {
      const b = (e.target as Element).closest('button[data-c]') as HTMLElement | null;
      if (!b) return;
      e.preventDefault();
      const c = b.dataset.c!;
      if (c === 'h2' || c === 'h3' || c === 'p') doc.execCommand('formatBlock', false, c);
      if (c === 'ul') doc.execCommand('insertUnorderedList');
      if (c === 'ol') doc.execCommand('insertOrderedList');
      if (c === 'bold') doc.execCommand('bold');
      if (c === 'link') {
        const href = win.prompt('Adresse du lien (par exemple /tarifs/)', '/');
        if (href) doc.execCommand('createLink', false, href);
      }
      body.dispatchEvent(new Event('input', { bubbles: true }));
    });
    body.addEventListener('focus', () => bar.classList.add('show'));
    body.addEventListener('blur', (e) => { if (!(e.relatedTarget as Element | null)?.closest?.('.ed-bodytools')) win.setTimeout(() => { if (doc.activeElement !== body) bar.classList.remove('show'); }, 150); });
    return { body };
  }

  doc.addEventListener('mouseover', onOver);
  doc.addEventListener('input', onInput);
  doc.addEventListener('keydown', onKey);
  doc.addEventListener('paste', onPaste);
  doc.addEventListener('click', onClick, true);
  doc.addEventListener('focusin', onFocusIn);
  doc.addEventListener('focusout', onFocusOut);
  itemBar.addEventListener('click', onItemBar);
  blockBar.addEventListener('click', onBlockBar);
  tools.addEventListener('mousedown', onToolDown);
  tools.addEventListener('change', onToolChange);

  return {
    count: targets.length + (post ? 1 : 0),
    skipped: [...skipped],
    // Met en évidence un texte de la page.
    reveal(file: string, path: Path) {
      const el = targets.find((t) => t.isConnected && t.dataset.ed === key(file, path));
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.remove('ed-flash');
      void el.offsetWidth;
      el.classList.add('ed-flash');
      return true;
    },
    // Reporte dans la page une modification faite dans la fenêtre « Réglages ».
    update(file: string, path: Path, raw: string) {
      for (const el of targets) {
        if (!el.isConnected || el.dataset.ed !== key(file, path) || el === doc.activeElement) continue;
        show(el, raw, meta.get(el)!.seg);
      }
    },
    // Les blocs ont changé ailleurs que dans la page : on les redessine.
    blocksChanged,
  };
}

// Même structure (mêmes listes, de même longueur) : les chemins des textes restent valables.
function sameShape(a: any, b: any): boolean {
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => sameShape(x, b[i]));
  if (a && typeof a === 'object') return !!b && typeof b === 'object' && Object.keys(a).every((k) => sameShape(a[k], b[k]));
  return true;
}

export function getAt(obj: any, path: Path) {
  return path.reduce((o, k) => (o == null ? o : o[k as any]), obj);
}
