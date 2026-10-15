// Édition directe dans la page : retrouve les textes du site dans la page affichée,
// les rend modifiables au clic, et permet d'ajouter, déplacer ou retirer les éléments d'une liste.
import { computeVars, fromEditDOM, normalize, tidy, toEditHTML, toPlain, VAR_LABELS, type Vars } from './markup';
import { cleanDescription, fieldAt, isMultiline, richness, type Entry, type Path } from './schema';
import EDIT_CSS from './inline.css?raw';

export interface Leaf { file: string; path: Path; raw: string; field: any; rank: number }

export interface InlineCtx {
  entries: Entry[]; // contenus de la page puis du site, par ordre de priorité
  base: Record<string, any>; // contenus enregistrés : c'est ce que la page affiche
  getFiles: () => Record<string, any>; // contenus en cours de modification
  onChange: (file: string, path: Path, raw: string) => void;
  onList: (file: string, path: Path, op: { type: 'duplicate' | 'remove' | 'up' | 'down'; index: number }) => void;
  onFocus: (file: string, path: Path, label: string) => void;
}

const key = (file: string, path: Path) => `${file}::${JSON.stringify(path)}`;
const SKIP = new Set(['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'TEMPLATE', 'SELECT', 'OPTION', 'TEXTAREA', 'INPUT', 'IFRAME', 'svg']);
const INLINE_OK = (el: Element) =>
  el.tagName === 'BR' || el.tagName === 'STRONG' || el.tagName === 'B' || el.tagName === 'EM' || el.tagName === 'A' ||
  (el.tagName === 'SPAN' && (el.classList.contains('hl') || !el.children.length));
const WRAP_TAGS = new Set(['A', 'BUTTON', 'LABEL', 'SUMMARY']);

// Tous les textes des contenus, avec leur chemin.
export function collectLeaves(entries: Entry[], files: Record<string, any>): Leaf[] {
  const out: Leaf[] = [];
  entries.forEach((e, rank) => {
    const walk = (v: any, path: Path) => {
      if (typeof v === 'string') {
        const field = fieldAt(e.schema, path);
        if (field && field.kind === 'form' && !field.options && v.trim()) out.push({ file: e.id, path, raw: v, field, rank });
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
  // On cherche les textes enregistrés (ceux que la page affiche), puis on montre la version modifiée.
  // Un fichier dont on a ajouté ou retiré des éléments n'est plus modifiable dans la page avant enregistrement.
  const shaped = new Set(ctx.entries.map((e) => e.id).filter((id) => sameShape(ctx.base[id], ctx.getFiles()[id])));
  const leaves = collectLeaves(ctx.entries.filter((e) => shaped.has(e.id)), ctx.base);
  const style = doc.createElement('style');
  style.textContent = EDIT_CSS;
  doc.head.appendChild(style);
  doc.documentElement.classList.add('ed-on');

  // Texte affiché → textes possibles (le plus prioritaire d'abord). Les textes de plusieurs paragraphes
  // sont aussi cherchés paragraphe par paragraphe.
  const byText = new Map<string, { leaf: Leaf; seg?: number }[]>();
  const add = (t: string, v: { leaf: Leaf; seg?: number }) => {
    const n = normalize(t);
    if (n.length < 2) return;
    if (!byText.has(n)) byText.set(n, []);
    byText.get(n)!.push(v);
  };
  for (const leaf of leaves) {
    add(toPlain(leaf.raw, vars), { leaf });
    const parts = leaf.raw.split(/\n\s*\n/);
    if (parts.length > 1) parts.forEach((p, i) => add(toPlain(p, vars), { leaf, seg: i }));
  }
  for (const list of byText.values()) list.sort((a, b) => a.leaf.rank - b.leaf.rank);

  const targets: HTMLElement[] = [];
  const owned = new WeakSet<Element>();

  // Parcours de la page : on garde l'élément le plus profond dont le texte correspond.
  const visit = (el: Element): boolean => {
    if (SKIP.has(el.tagName) || el.closest('.ed-ui')) return false;
    let childMatched = false;
    for (const c of Array.from(el.children)) if (visit(c)) childMatched = true;
    if (childMatched) return true;
    const text = normalize(el.textContent ?? '');
    const found = byText.get(text);
    if (!found) return false;
    const target = prepare(el as HTMLElement, text);
    if (!target) return false;
    const { leaf, seg } = found[0];
    bind(target, leaf, seg);
    return true;
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

  const meta = new WeakMap<HTMLElement, { file: string; path: Path; seg?: number; field: any }>();

  const bind = (el: HTMLElement, leaf: Leaf, seg?: number) => {
    owned.add(el);
    const hlClass = el.querySelector('.hl')?.className ?? 'hl';
    const draft = getAt(ctx.getFiles()[leaf.file], leaf.path);
    const value = typeof draft === 'string' ? draft : leaf.raw;
    const raw = seg === undefined ? value : value.split(/\n\s*\n/)[seg] ?? '';
    el.innerHTML = toEditHTML(raw, vars, hlClass);
    el.contentEditable = 'true';
    el.spellcheck = true;
    el.dataset.ed = key(leaf.file, leaf.path);
    el.dataset.edLabel = leaf.field?.label ?? '';
    meta.set(el, { file: leaf.file, path: leaf.path, seg, field: leaf.field });
    targets.push(el);
  };

  visit(doc.body);

  /* ---------- Listes : ajouter, déplacer, retirer ---------- */

  type Item = { el: HTMLElement; index: number };
  const lists = new Map<string, { file: string; path: Path; items: Item[] }>();

  const arrayOf = (file: string, path: Path) => {
    const entry = ctx.entries.find((e) => e.id === file)!;
    for (let i = path.length - 1; i > 0; i--) {
      if (typeof path[i] !== 'number') continue;
      const parent = path.slice(0, i);
      const f = fieldAt(entry.schema, parent);
      if (f?.kind === 'array' && f.element?.kind !== 'conditional') return { arr: parent, index: path[i] as number, depth: i };
    }
    return null;
  };

  const groups = new Map<string, { file: string; arr: Path; byIndex: Map<number, HTMLElement[]> }>();
  for (const el of targets) {
    const m = meta.get(el)!;
    const a = arrayOf(m.file, m.path);
    if (!a) continue;
    const k = key(m.file, a.arr);
    if (!groups.has(k)) groups.set(k, { file: m.file, arr: a.arr, byIndex: new Map() });
    const g = groups.get(k)!;
    if (!g.byIndex.has(a.index)) g.byIndex.set(a.index, []);
    g.byIndex.get(a.index)!.push(el);
  }

  const lca = (a: Element, b: Element) => {
    const anc = new Set<Element>();
    for (let x: Element | null = a; x; x = x.parentElement) anc.add(x);
    for (let x: Element | null = b; x; x = x.parentElement) if (anc.has(x)) return x;
    return null;
  };

  for (const [k, g] of groups) {
    const indexes = [...g.byIndex.keys()].sort((a, b) => a - b);
    const firstOf = (i: number) => g.byIndex.get(i)![0];
    let container: Element | null = null;
    if (indexes.length >= 2) container = lca(firstOf(indexes[0]), firstOf(indexes[1]));
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
    // On ne propose la liste que si chaque élément trouvé est bien séparé des autres.
    if (!items.length || (container && items.length !== indexes.length)) continue;
    const length = getAt(ctx.getFiles()[g.file], g.arr)?.length ?? 0;
    if (items.length !== length) continue; // la page n'affiche pas toute la liste : on passe par le panneau
    lists.set(k, { file: g.file, path: g.arr, items });
    items.forEach((it) => { it.el.dataset.edItem = k; });
  }

  // Barre d'outils de liste, affichée au survol d'un élément.
  const bar = doc.createElement('div');
  bar.className = 'ed-ui ed-itembar';
  bar.innerHTML = `
    <button type="button" data-op="up" title="Monter">↑</button>
    <button type="button" data-op="down" title="Descendre">↓</button>
    <button type="button" data-op="duplicate" title="Ajouter un élément après celui-ci">＋ Ajouter</button>
    <button type="button" data-op="remove" title="Retirer cet élément">Retirer</button>`;
  doc.body.appendChild(bar);
  let barItem: HTMLElement | null = null;

  const placeBar = (it: HTMLElement) => {
    barItem = it;
    const r = it.getBoundingClientRect();
    bar.style.top = `${r.top + win.scrollY - 14}px`;
    bar.style.left = `${Math.max(8, r.right + win.scrollX - bar.offsetWidth)}px`;
    bar.classList.add('show');
    const list = lists.get(it.dataset.edItem!)!;
    const pos = list.items.findIndex((x) => x.el === it);
    (bar.querySelector('[data-op=up]') as HTMLButtonElement).disabled = pos === 0;
    (bar.querySelector('[data-op=down]') as HTMLButtonElement).disabled = pos === list.items.length - 1;
    (bar.querySelector('[data-op=remove]') as HTMLButtonElement).disabled = list.items.length <= 1;
  };

  const onOver = (e: MouseEvent) => {
    const t = e.target as Element;
    if (t.closest('.ed-itembar')) return;
    const it = t.closest('[data-ed-item]') as HTMLElement | null;
    if (it) placeBar(it);
    else if (!bar.matches(':hover')) bar.classList.remove('show');
  };

  // Textes modifiables d'un élément de liste (l'élément lui-même peut en être un).
  const edsIn = (el: HTMLElement) => [...(el.matches('[data-ed]') ? [el] : []), ...el.querySelectorAll<HTMLElement>('[data-ed]')];

  // Met à jour les chemins des textes après un changement d'ordre.
  const reindex = (list: { file: string; path: Path; items: Item[] }) => {
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

  const onBar = (e: MouseEvent) => {
    const btn = (e.target as Element).closest('button[data-op]') as HTMLButtonElement | null;
    if (!btn || !barItem) return;
    e.preventDefault();
    const list = lists.get(barItem.dataset.edItem!)!;
    const pos = list.items.findIndex((x) => x.el === barItem);
    const op = btn.dataset.op as 'up' | 'down' | 'duplicate' | 'remove';
    const it = list.items[pos];
    if (op === 'duplicate') {
      const copy = it.el.cloneNode(true) as HTMLElement;
      it.el.after(copy);
      const origs = edsIn(it.el);
      edsIn(copy).forEach((c, n) => {
        const m = origs[n] && meta.get(origs[n]);
        if (m) { meta.set(c, { ...m, path: [...m.path] }); targets.push(c); }
      });
      list.items.splice(pos + 1, 0, { el: copy, index: pos + 1 });
      copy.classList.add('ed-new');
      ctx.onList(list.file, list.path, { type: 'duplicate', index: pos });
      reindex(list);
      const first = edsIn(copy)[0];
      if (first) { first.focus(); selectAll(first); showTools(first); }
    } else if (op === 'remove') {
      it.el.remove();
      list.items.splice(pos, 1);
      ctx.onList(list.file, list.path, { type: 'remove', index: pos });
      reindex(list);
      bar.classList.remove('show');
    } else {
      const to = op === 'up' ? pos - 1 : pos + 1;
      const other = list.items[to];
      if (op === 'up') other.el.before(it.el);
      else other.el.after(it.el);
      [list.items[pos], list.items[to]] = [list.items[to], list.items[pos]];
      ctx.onList(list.file, list.path, { type: op, index: pos });
      reindex(list);
      placeBar(it.el);
    }
  };

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
    const parts = current.split(/\n\s*\n/);
    parts[m.seg] = value;
    return parts.join('\n\n');
  };

  const onInput = (e: Event) => {
    const el = (e.target as Element).closest?.('[data-ed]') as HTMLElement | null;
    if (!el) return;
    const m = meta.get(el)!;
    const raw = fullRaw(el);
    ctx.onChange(m.file, m.path, raw);
    // Même texte affiché ailleurs dans la page (ex. un bouton répété) : on le met à jour aussi.
    for (const other of targets) {
      if (other === el || other.dataset.ed !== el.dataset.ed || !other.isConnected) continue;
      const om = meta.get(other)!;
      other.innerHTML = toEditHTML(om.seg === undefined ? raw : raw.split(/\n\s*\n/)[om.seg] ?? '', vars, other.querySelector('.hl')?.className ?? 'hl');
    }
  };

  const onKey = (e: KeyboardEvent) => {
    const el = (e.target as Element).closest?.('[data-ed]') as HTMLElement | null;
    if (!el) return;
    const m = meta.get(el)!;
    if (e.key === 'Enter' && !(isMultiline(m.field) && m.seg === undefined && e.shiftKey)) {
      e.preventDefault();
      if (!isMultiline(m.field) || m.seg !== undefined) el.blur();
    }
    if (e.key === 'Escape') el.blur();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); format('bold'); }
  };

  const onPaste = (e: ClipboardEvent) => {
    if (!(e.target as Element).closest?.('[data-ed]')) return;
    e.preventDefault();
    const text = (e.clipboardData?.getData('text/plain') ?? '').replace(/\s*\n\s*/g, ' ');
    doc.execCommand('insertText', false, text);
  };

  // Les liens et boutons ne s'ouvrent pas pendant qu'on modifie leur texte.
  const onClick = (e: MouseEvent) => {
    const t = e.target as Element;
    if (t.closest('[data-ed]')) { e.preventDefault(); return; }
    const a = t.closest('a[href]') as HTMLAnchorElement | null;
    if (a && (a.target === '_blank' || new URL(a.href, win.location.href).origin !== win.location.origin)) e.preventDefault();
  };

  /* ---------- Barre de mise en forme ---------- */

  const tools = doc.createElement('div');
  tools.className = 'ed-ui ed-tools';
  doc.body.appendChild(tools);
  let active: HTMLElement | null = null;

  const showTools = (el: HTMLElement) => {
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
    ctx.onFocus(m.file, m.path, label);
  };

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
    if (el) showTools(el);
  };
  const onFocusOut = (e: FocusEvent) => {
    const to = e.relatedTarget as Element | null;
    if (to && to.closest?.('.ed-tools')) return;
    win.setTimeout(() => {
      if (!doc.activeElement?.closest?.('[data-ed], .ed-tools')) { tools.classList.remove('show'); active = null; }
    }, 150);
  };

  doc.addEventListener('mouseover', onOver);
  doc.addEventListener('input', onInput);
  doc.addEventListener('keydown', onKey);
  doc.addEventListener('paste', onPaste);
  doc.addEventListener('click', onClick, true);
  doc.addEventListener('focusin', onFocusIn);
  doc.addEventListener('focusout', onFocusOut);
  bar.addEventListener('click', onBar);
  tools.addEventListener('mousedown', onToolDown);
  tools.addEventListener('change', onToolChange);

  return {
    count: targets.length,
    skipped: ctx.entries.map((e) => e.id).filter((id) => !shaped.has(id)),
    // Met en évidence un texte de la page (quand on clique sur un champ du panneau).
    reveal(file: string, path: Path) {
      const el = targets.find((t) => t.isConnected && t.dataset.ed === key(file, path));
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.remove('ed-flash');
      void el.offsetWidth;
      el.classList.add('ed-flash');
      return true;
    },
    has(file: string, path: Path) {
      return targets.some((t) => t.isConnected && t.dataset.ed === key(file, path));
    },
    // Reporte dans la page une modification faite dans le panneau.
    update(file: string, path: Path, raw: string) {
      for (const el of targets) {
        if (!el.isConnected || el.dataset.ed !== key(file, path) || el === doc.activeElement) continue;
        const m = meta.get(el)!;
        el.innerHTML = toEditHTML(m.seg === undefined ? raw : raw.split(/\n\s*\n/)[m.seg] ?? '', vars, el.querySelector('.hl')?.className ?? 'hl');
      }
    },
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
