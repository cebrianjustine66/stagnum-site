// Champs de la fenêtre « Réglages », construits à partir de la description des contenus (keystatic.config.ts).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { fromEditDOM, tidy, toEditHTML, VAR_LABELS, type Vars } from './markup';
import { cleanDescription, isMultiline, richness, type Field, type Path } from './schema';

export interface FieldCtx {
  file: string;
  vars: Vars;
  focusKey: string | null;
  onChange: (path: Path, value: any) => void;
  onReveal: (path: Path) => boolean;
}

export const pathKey = (file: string, path: Path) => `${file}::${JSON.stringify(path)}`;

// Valeur par défaut d'un nouvel élément de liste.
export function defaultOf(field: Field): any {
  if (!field) return '';
  if (field.kind === 'object') return Object.fromEntries(Object.entries(field.fields).map(([k, f]) => [k, defaultOf(f)]));
  if (field.kind === 'array') return [];
  if (field.kind === 'conditional') {
    const d = field.discriminant.defaultValue();
    return { discriminant: d, value: defaultOf(field.values[d]) };
  }
  try {
    const v = field.defaultValue?.();
    return v === undefined || v === null ? (field.options ? field.options[0]?.value : '') : typeof v === 'object' && !Array.isArray(v) ? '' : v;
  } catch {
    return '';
  }
}

// Intitulé d'un élément de liste, avec la fonction prévue dans la configuration.
function preview(field: Field, value: any): any {
  if (!field) return { value };
  if (field.kind === 'object') return { fields: Object.fromEntries(Object.entries(field.fields).map(([k, f]) => [k, preview(f, value?.[k])])) };
  if (field.kind === 'array') return { elements: (value ?? []).map((v: any) => preview(field.element, v)) };
  if (field.kind === 'conditional') return { discriminant: value?.discriminant, value: preview(field.values[value?.discriminant], value?.value) };
  return { value };
}
const strip = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*+/g, '');
function itemTitle(arr: Field, value: any, i: number) {
  try {
    const t = arr.itemLabel?.(preview(arr.element, value));
    if (typeof t === 'string' && t.trim()) return strip(t);
  } catch {}
  if (typeof value === 'string') return strip(value) || `Élément ${i + 1}`;
  const first = value && Object.values(value).find((v) => typeof v === 'string' && v.trim());
  return first ? strip(first as string) : `Élément ${i + 1}`;
}

const Help = ({ field }: { field: Field }) => {
  const d = cleanDescription(field?.description);
  return d ? <p className="f-help">{d}</p> : null;
};

/* ---------- Texte, avec surlignage, liens et valeurs automatiques ---------- */

function RichText({ value, onChange, vars, field, multiline }: { value: string; onChange: (v: string) => void; vars: Vars; field: Field; multiline: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  const r = richness(field);
  const showHl = r.hl || /\*[^*]+\*/.test(value);
  const showLink = r.link || /\]\(/.test(value);
  const showVars = r.vars || /\{\w+\}/.test(value);

  useLayoutEffect(() => {
    if (!ref.current || value === last.current) return;
    if (document.activeElement === ref.current) return;
    ref.current.innerHTML = toEditHTML(value, vars, 'hl');
    last.current = value;
  }, [value, vars]);

  const emit = () => {
    const v = tidy(fromEditDOM(ref.current!));
    last.current = v;
    onChange(v);
  };

  const wrap = (kind: 'hl' | 'link') => {
    const sel = getSelection();
    const el = ref.current!;
    if (!sel?.rangeCount || !el.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    const host = (range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer as Element : range.commonAncestorContainer.parentElement)!;
    const existing = host.closest(kind === 'hl' ? '.hl' : 'a');
    if (existing && el.contains(existing)) existing.replaceWith(...Array.from(existing.childNodes));
    else if (!range.collapsed) {
      let w: HTMLElement;
      if (kind === 'hl') { w = document.createElement('span'); w.className = 'hl'; }
      else {
        const href = prompt('Adresse du lien (par exemple /tarifs/)', '/');
        if (!href) return;
        w = document.createElement('a'); w.setAttribute('href', href);
      }
      w.appendChild(range.extractContents());
      range.insertNode(w);
    }
    el.normalize();
    emit();
  };

  const insertVar = (k: string) => {
    const el = ref.current!;
    el.focus();
    const sel = getSelection()!;
    const chip = document.createElement('span');
    chip.className = 'ed-var'; chip.contentEditable = 'false'; chip.dataset.var = k; chip.textContent = vars[k];
    if (sel.rangeCount && el.contains(sel.anchorNode)) { const range = sel.getRangeAt(0); range.deleteContents(); range.insertNode(chip); }
    else el.appendChild(chip);
    emit();
  };

  return (
    <div className="rt">
      <div
        ref={ref}
        className={`rt-input${multiline ? ' multi' : ''}`}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onKeyDown={(e) => { if (e.key === 'Enter' && !multiline) e.preventDefault(); }}
        onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }}
      />
      {(showHl || showLink || showVars) && (
        <div className="rt-tools">
          {showHl && <button type="button" onMouseDown={(e) => { e.preventDefault(); wrap('hl'); }} title="Sélectionnez des mots puis cliquez"><span className="rt-hl">Surligner</span></button>}
          {showLink && <button type="button" onMouseDown={(e) => { e.preventDefault(); wrap('link'); }}>Lien</button>}
          {showVars && (
            <select value="" onChange={(e) => e.target.value && insertVar(e.target.value)}>
              <option value="">Insérer une valeur…</option>
              {Object.entries(VAR_LABELS).map(([k, l]) => <option key={k} value={k}>{l} ({vars[k]})</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Un champ, selon son type ---------- */

export function FieldView({ field, value, path, ctx, label }: { field: Field; value: any; path: Path; ctx: FieldCtx; label?: string }): ReactNode {
  const k = pathKey(ctx.file, path);
  const focused = ctx.focusKey === k;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused && ref.current) ref.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focused]);

  if (!field) return null;
  if (field.kind === 'object') {
    return (
      <div className="f-group">
        {label !== undefined ? null : field.label && path.length > 1 ? <p className="f-group-title">{field.label}</p> : null}
        {Object.entries(field.fields).map(([name, f]) => (
          <FieldView key={name} field={f} value={value?.[name]} path={[...path, name]} ctx={ctx} />
        ))}
      </div>
    );
  }
  if (field.kind === 'array') return field.element?.kind === 'conditional'
    ? <BlocksView field={field} value={value ?? []} path={path} ctx={ctx} />
    : <ArrayView field={field} value={value ?? []} path={path} ctx={ctx} />;

  const title = label ?? (field.formKind === 'slug' ? field.label ?? 'Nom' : field.label);
  const set = (v: any) => ctx.onChange(path, v);
  let input: ReactNode;
  if (field.formKind === 'asset') {
    input = value ? <img className="f-img" src={`/${String(value).replace(/^\/?(src\/)?/, '')}`} alt="" /> : <p className="f-help">Aucune image</p>;
  } else if (field.options && Array.isArray(value)) {
    input = (
      <div className="f-checks">
        {field.options.map((o: any) => (
          <label key={o.value}><input type="checkbox" checked={value.includes(o.value)} onChange={(e) => set(e.target.checked ? [...value, o.value] : value.filter((x: string) => x !== o.value))} /> {o.label}</label>
        ))}
      </div>
    );
  } else if (field.options) {
    input = (
      <select className="f-select" value={value ?? defaultOf(field) ?? ''} onChange={(e) => set(e.target.value)}>
        {field.options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  } else if (typeof value === 'number' || (value == null && typeof defaultOf(field) === 'number')) {
    input = <input className="f-input f-num" type="number" value={value ?? ''} onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))} />;
  } else if (typeof value === 'boolean') {
    input = <label className="f-switch"><input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} /><span /></label>;
  } else {
    input = <RichText value={value ?? ''} onChange={set} vars={ctx.vars} field={field} multiline={isMultiline(field)} />;
  }
  const inPage = typeof value === 'string';
  return (
    <div ref={ref} className={`f${focused ? ' focused' : ''}`} data-key={k}>
      <div className="f-head">
        <span className="f-label">{title}</span>
        {inPage && <button type="button" className="f-locate" title="Voir dans la page" onClick={() => ctx.onReveal(path)}>Voir</button>}
      </div>
      {input}
      <Help field={field} />
    </div>
  );
}

/* ---------- Listes ---------- */

function move<T>(arr: T[], from: number, to: number) {
  const a = [...arr];
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}

function ItemShell({ title, index, count, onMove, onRemove, onDuplicate, children, open, setOpen }: {
  title: string; index: number; count: number; onMove: (to: number) => void; onRemove: () => void; onDuplicate: () => void;
  children: ReactNode; open: boolean; setOpen: (o: boolean) => void;
}) {
  return (
    <div className={`item${open ? ' open' : ''}`}>
      <div className="item-head">
        <button type="button" className="item-toggle" onClick={() => setOpen(!open)}>
          <span className="item-num">{index + 1}</span>
          <span className="item-title">{title}</span>
        </button>
        <div className="item-tools">
          <button type="button" title="Monter" disabled={index === 0} onClick={() => onMove(index - 1)}>↑</button>
          <button type="button" title="Descendre" disabled={index === count - 1} onClick={() => onMove(index + 1)}>↓</button>
          <button type="button" title="Dupliquer" onClick={onDuplicate}>⧉</button>
          <button type="button" title="Retirer" className="danger" onClick={() => { if (confirm('Retirer cet élément ?')) onRemove(); }}>✕</button>
        </div>
      </div>
      {open && <div className="item-body">{children}</div>}
    </div>
  );
}

function ArrayView({ field, value, path, ctx }: { field: Field; value: any[]; path: Path; ctx: FieldCtx }) {
  const [open, setOpen] = useState<number | null>(null);
  const simple = field.element?.kind === 'form';
  // Un texte de la liste est sélectionné dans la page : on ouvre l'élément correspondant.
  useEffect(() => {
    if (!ctx.focusKey?.startsWith(`${ctx.file}::`)) return;
    const p = JSON.parse(ctx.focusKey.slice(ctx.file.length + 2)) as Path;
    if (JSON.stringify(p.slice(0, path.length)) === JSON.stringify(path) && typeof p[path.length] === 'number') setOpen(p[path.length] as number);
  }, [ctx.focusKey]);
  const set = (v: any[]) => ctx.onChange(path, v);
  return (
    <div className="f f-array">
      <div className="f-head"><span className="f-label">{field.label}</span><span className="f-count">{value.length}</span></div>
      <Help field={field} />
      <div className="items">
        {value.map((v, i) =>
          simple ? (
            <div key={i} className="item-simple">
              <FieldView field={field.element} value={v} path={[...path, i]} ctx={ctx} label="" />
              <div className="item-tools">
                <button type="button" title="Monter" disabled={i === 0} onClick={() => set(move(value, i, i - 1))}>↑</button>
                <button type="button" title="Descendre" disabled={i === value.length - 1} onClick={() => set(move(value, i, i + 1))}>↓</button>
                <button type="button" title="Retirer" className="danger" onClick={() => set(value.filter((_, j) => j !== i))}>✕</button>
              </div>
            </div>
          ) : (
            <ItemShell key={i} title={itemTitle(field, v, i)} index={i} count={value.length} open={open === i} setOpen={(o) => setOpen(o ? i : null)}
              onMove={(to) => { set(move(value, i, to)); setOpen(to); }}
              onRemove={() => set(value.filter((_, j) => j !== i))}
              onDuplicate={() => { const a = [...value]; a.splice(i + 1, 0, structuredClone(v)); set(a); setOpen(i + 1); }}>
              <FieldView field={field.element} value={v} path={[...path, i]} ctx={ctx} label="" />
            </ItemShell>
          ),
        )}
      </div>
      <button type="button" className="add" onClick={() => { set([...value, defaultOf(field.element)]); setOpen(value.length); }}>＋ Ajouter</button>
    </div>
  );
}

function BlocksView({ field, value, path, ctx }: { field: Field; value: any[]; path: Path; ctx: FieldCtx }) {
  const [open, setOpen] = useState<number | null>(null);
  const [choosing, setChoosing] = useState(false);
  const cond = field.element;
  const types = cond.discriminant.options as { label: string; value: string }[];
  const set = (v: any[]) => ctx.onChange(path, v);
  return (
    <div className="f f-array">
      <div className="f-head"><span className="f-label">{field.label}</span><span className="f-count">{value.length}</span></div>
      <Help field={field} />
      <div className="items">
        {value.map((b, i) => (
          <ItemShell key={i} title={itemTitle(field, b, i)} index={i} count={value.length} open={open === i} setOpen={(o) => setOpen(o ? i : null)}
            onMove={(to) => { set(move(value, i, to)); setOpen(to); }}
            onRemove={() => set(value.filter((_, j) => j !== i))}
            onDuplicate={() => { const a = [...value]; a.splice(i + 1, 0, structuredClone(b)); set(a); setOpen(i + 1); }}>
            <FieldView field={cond.values[b.discriminant]} value={b.value} path={[...path, i, 'value']} ctx={ctx} label="" />
          </ItemShell>
        ))}
      </div>
      {choosing ? (
        <div className="choose">
          <p className="f-help">Quel type de bloc ?</p>
          {types.map((t) => (
            <button key={t.value} type="button" onClick={() => { set([...value, { discriminant: t.value, value: defaultOf(cond.values[t.value]) }]); setOpen(value.length); setChoosing(false); }}>
              {t.label}
            </button>
          ))}
          <button type="button" className="ghost" onClick={() => setChoosing(false)}>Annuler</button>
        </div>
      ) : (
        <button type="button" className="add" onClick={() => setChoosing(true)}>＋ Ajouter un bloc</button>
      )}
    </div>
  );
}
