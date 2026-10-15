// Éditeur visuel du site : la page s'affiche au centre, on clique sur un texte pour le modifier,
// le panneau de droite montre tous les champs de la page, et « Publier » enregistre.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { attachInline, getAt } from './inline';
import { computeVars } from './markup';
import { entriesForUrl, pickerPages, type Entry, type Path } from './schema';
import { AuthError, ConflictError, currentUser, load, login, logout, ONLINE, save, type Loaded, type User } from './source';
import { FieldView, pathKey, type FieldCtx } from './Fields';

type Files = Record<string, any>;
type Status = 'loading' | 'login' | 'noaccess' | 'ready' | 'error';
const DRAFT_KEY = 'stagnum-edition-brouillon';
const serialize = (v: any) => JSON.stringify(v, null, 2) + '\n';

function setAt(obj: any, path: Path, value: any): any {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  copy[k as any] = setAt(obj?.[k as any], rest, value);
  return copy;
}

const readDraft = (): { texts: Record<string, string>; files: Files } | null => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null'); } catch { return null; }
};

export default function App() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [base, setBase] = useState<Files>({});
  const [files, setFiles] = useState<Files>({});
  const [url, setUrl] = useState(() => new URLSearchParams(location.search).get('page') || '/');
  const [frameKey, setFrameKey] = useState(0);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [tab, setTab] = useState<'page' | 'site'>('page');
  const [focus, setFocus] = useState<{ key: string; label: string } | null>(null);
  const [inlineCount, setInlineCount] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [toast, setToast] = useState<{ text: string; kind?: 'ok' | 'err' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const inline = useRef<ReturnType<typeof attachInline> | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  const say = (text: string, kind?: 'ok' | 'err') => {
    setToast({ text, kind });
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), kind === 'err' ? 8000 : 4500);
  };

  /* ---------- Chargement ---------- */

  const start = useCallback(async () => {
    setStatus('loading');
    try {
      if (ONLINE) setUser(await currentUser());
      const l = await load();
      const parsed: Files = {};
      for (const [p, t] of Object.entries(l.texts)) if (p.endsWith('.json')) parsed[p] = JSON.parse(t);
      setLoaded(l);
      setBase(parsed);
      // Brouillon gardé dans ce navigateur : on le reprend pour les fichiers qui n'ont pas changé depuis.
      const d = readDraft();
      const merged = { ...parsed };
      if (d) for (const [p, v] of Object.entries(d.files)) if (d.texts[p] === l.texts[p]) merged[p] = v;
      setFiles(merged);
      setStatus('ready');
    } catch (e) {
      if (e instanceof AuthError) setStatus(e.message === 'no-access' ? 'noaccess' : 'login');
      else { setError(String((e as Error).message ?? e)); setStatus('error'); }
    }
  }, []);
  useEffect(() => { start(); }, [start]);

  const changed = useMemo(() => Object.keys(files).filter((p) => serialize(files[p]) !== serialize(base[p])), [files, base]);

  // Brouillon enregistré dans le navigateur à chaque modification.
  useEffect(() => {
    if (status !== 'ready' || !loaded) return;
    try {
      if (!changed.length) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ texts: Object.fromEntries(changed.map((p) => [p, loaded.texts[p]])), files: Object.fromEntries(changed.map((p) => [p, files[p]])) }));
    } catch {}
  }, [files, changed, status, loaded]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (changed.length) e.preventDefault(); };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [changed.length]);

  const { own, site } = useMemo(() => entriesForUrl(url, files), [url, files]);
  const vars = useMemo(() => computeVars(files), [files]);

  /* ---------- Modifications ---------- */

  const change = useCallback((file: string, path: Path, value: any) => {
    setFiles((f) => ({ ...f, [file]: setAt(f[file], path, value) }));
    if (typeof value === 'string') inline.current?.update(file, path, value);
  }, []);

  const listOp = useCallback((file: string, path: Path, op: { type: string; index: number }) => {
    setFiles((f) => {
      const arr = [...(getAt(f[file], path) as any[])];
      const i = op.index;
      if (op.type === 'duplicate') arr.splice(i + 1, 0, structuredClone(arr[i]));
      if (op.type === 'remove') arr.splice(i, 1);
      if (op.type === 'up') [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (op.type === 'down') [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      return { ...f, [file]: setAt(f[file], path, arr) };
    });
  }, []);

  /* ---------- Page affichée ---------- */

  const onFrameLoad = () => {
    const win = frame.current?.contentWindow;
    const doc = frame.current?.contentDocument;
    if (!win || !doc) return;
    const path = win.location.pathname;
    setUrl(path);
    history.replaceState(null, '', `?page=${encodeURIComponent(path)}`);
    const { own: o, site: s } = entriesForUrl(path, filesRef.current);
    // Les textes s'attachent une fois la page prête (polices et animations d'entrée comprises).
    win.setTimeout(() => {
      inline.current = attachInline(doc, {
        entries: [...o, ...s],
        base,
        getFiles: () => filesRef.current,
        onChange: change,
        onList: listOp,
        onFocus: (file, p, label) => { setFocus({ key: pathKey(file, p), label }); setTab(o.some((e) => e.id === file) ? 'page' : 'site'); },
      });
      setInlineCount(inline.current.count);
      setSkipped(inline.current.skipped);
    }, 300);
  };

  const go = (u: string) => { setPicker(false); setFocus(null); if (u === url) setFrameKey((k) => k + 1); else setUrl(u); };

  /* ---------- Publication ---------- */

  const labelOf = (p: string) => [...own, ...site, ...entriesForUrl('/', files).own].find((e) => e.id === p)?.label
    ?? (p.startsWith('src/content/pages/') ? files[p]?.nav : p.split('/').pop()?.replace('.json', ''));

  const publish = async () => {
    if (!loaded || !changed.length) return;
    setBusy(true);
    try {
      const names = [...new Set(changed.map(labelOf))].join(', ');
      await save(Object.fromEntries(changed.map((p) => [p, serialize(files[p])])), loaded, `Met à jour le contenu du site : ${names}`);
      localStorage.removeItem(DRAFT_KEY);
      say(ONLINE ? 'Publié ! Le site se met à jour tout seul d’ici une à deux minutes.' : 'Enregistré. La page se met à jour.', 'ok');
      await start();
      setFrameKey((k) => k + 1);
    } catch (e) {
      if (e instanceof ConflictError) say(`Quelqu’un a modifié ${e.files.map(labelOf).join(', ')} entre-temps. Vos modifications sont gardées : rechargez la page pour repartir de la dernière version.`, 'err');
      else if (e instanceof AuthError) { setStatus('login'); }
      else say(`La publication a échoué : ${(e as Error).message}`, 'err');
    } finally {
      setBusy(false);
    }
  };

  const discard = () => {
    if (!confirm(`Annuler ${changed.length > 1 ? `les modifications de ${changed.length} rubriques` : 'les modifications'} ? Elles seront perdues.`)) return;
    setFiles(base);
    localStorage.removeItem(DRAFT_KEY);
    setFrameKey((k) => k + 1);
  };

  /* ---------- Écrans ---------- */

  if (status === 'loading') return <div className="screen"><div className="spinner" /><p>Chargement du site…</p></div>;
  if (status === 'login' || status === 'noaccess') {
    return (
      <div className="screen">
        <div className="card">
          <img src="/favicon-64.png" alt="" width="48" height="48" />
          <h1>Modifier le site Stagnum</h1>
          {status === 'login' ? (
            <>
              <p>Connectez-vous avec votre compte GitHub pour modifier les textes du site.</p>
              <button className="btn primary" onClick={login}>Se connecter avec GitHub</button>
            </>
          ) : (
            <>
              <p>Votre compte GitHub n’a pas encore accès au site. Demandez à un administrateur de vous inviter sur le dépôt, puis reconnectez-vous.</p>
              <button className="btn" onClick={logout}>Changer de compte</button>
            </>
          )}
        </div>
      </div>
    );
  }
  if (status === 'error') return <div className="screen"><div className="card"><h1>Le site n’a pas pu être chargé</h1><p>{error}</p><button className="btn primary" onClick={start}>Réessayer</button></div></div>;

  const shown = tab === 'page' ? own : site;
  const pages = pickerPages(files);
  const current = pages.flatMap((g) => g.items).find((i) => i.url === url)?.label ?? url;
  const fieldCtx = (e: Entry): FieldCtx => ({
    file: e.id,
    vars,
    focusKey: focus?.key ?? null,
    onChange: (p, v) => change(e.id, p, v),
    onReveal: (p) => inline.current?.reveal(e.id, p) ?? false,
  });

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><img src="/favicon-64.png" alt="" width="28" height="28" /><span>Stagnum</span><em>Édition</em></div>

        <div className="pick">
          <button className="pick-btn" onClick={() => setPicker(!picker)}>
            <span className="pick-k">Page</span><strong>{current}</strong><span className="chev">▾</span>
          </button>
          {picker && (
            <>
              <div className="veil" onClick={() => setPicker(false)} />
              <div className="pick-menu">
                {pages.map((g) => (
                  <div key={g.group}>
                    <p className="pick-group">{g.group}</p>
                    {g.items.map((i) => (
                      <button key={i.url} className={i.url === url ? 'on' : ''} onClick={() => go(i.url)}>
                        {i.label}
                        {changed.some((p) => entriesForUrl(i.url, files).own.some((e) => e.id === p)) && <span className="dot" title="Modifiée" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="device">
          <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')} title="Ordinateur">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
          </button>
          <button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')} title="Téléphone">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></svg>
          </button>
        </div>

        <div className="actions">
          {user && (
            <button className="me" onClick={() => confirm('Se déconnecter ?') && logout()} title={`Connecté : ${user.name}`}>
              <img src={user.avatar} alt="" width="28" height="28" />
            </button>
          )}
          {changed.length > 0 && <button className="btn ghost" onClick={discard}>Annuler</button>}
          <button className="btn primary" disabled={!changed.length || busy} onClick={publish}>
            {busy ? 'Publication…' : ONLINE ? 'Publier' : 'Enregistrer'}
            {changed.length > 0 && !busy && <span className="badge">{changed.length}</span>}
          </button>
        </div>
      </header>

      <main className="main">
        <section className={`stage ${device}`}>
          <div className="hint">
            <span className="pulse" />
            {inlineCount ? 'Cliquez sur un texte pour le modifier. Survolez une liste pour ajouter ou retirer un élément.' : 'Chargement de la page…'}
          </div>
          <div className="frame-wrap">
            <iframe key={frameKey} ref={frame} src={url} onLoad={onFrameLoad} title="Aperçu du site" />
          </div>
        </section>

        <aside className="panel">
          <div className="tabs">
            <button className={tab === 'page' ? 'on' : ''} onClick={() => setTab('page')}>Cette page</button>
            <button className={tab === 'site' ? 'on' : ''} onClick={() => setTab('site')}>Tout le site</button>
          </div>
          <div className="panel-body">
            {tab === 'site' && <p className="panel-intro">Ce qui revient sur plusieurs pages : le menu, les boutons, le formulaire, les prix des briques…</p>}
            {tab === 'page' && !shown.length && (url.startsWith('/blog/') && url !== '/blog/'
              ? <div className="notice"><strong>Les articles du blog</strong><p>Pour l’instant, le texte des articles se modifie dans l’ancien éditeur.</p><a className="btn" href="/keystatic/collection/posts" target="_blank">Ouvrir les articles</a></div>
              : <p className="panel-intro">Cette page n’a pas de textes à elle : ses textes viennent de « Tout le site ».</p>)}
            {skipped.length > 0 && <div className="notice"><p>Vos ajouts dans {skipped.map((p) => `« ${labelOf(p)} »`).join(', ')} apparaîtront dans la page après {ONLINE ? 'publication' : 'enregistrement'}. En attendant, modifiez ces textes dans le panneau.</p></div>}
            {shown.map((e) => (
              <EntryView key={e.id} entry={e} value={files[e.id]} ctx={fieldCtx(e)} changed={changed.includes(e.id)} defaultOpen={tab === 'page' && shown.length === 1} focusKey={focus?.key ?? null} />
            ))}
          </div>
        </aside>
      </main>

      {toast && <div className={`toast ${toast.kind ?? ''}`}>{toast.text}</div>}
    </div>
  );
}

// Une rubrique : ses grandes parties (groupes) se replient.
function EntryView({ entry, value, ctx, changed, defaultOpen, focusKey }: { entry: Entry; value: any; ctx: FieldCtx; changed: boolean; defaultOpen: boolean; focusKey: string | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(defaultOpen);
  const groups = Object.entries(entry.schema);
  // Ouvre la partie qui contient le texte sélectionné dans la page.
  useEffect(() => {
    if (!focusKey?.startsWith(`${entry.id}::`)) return;
    const p = JSON.parse(focusKey.slice(entry.id.length + 2)) as Path;
    setShown(true);
    const top = String(p[0]);
    setOpen(entry.schema[top]?.kind === 'object' || entry.schema[top]?.kind === 'array' ? top : null);
  }, [focusKey, entry.id]);
  useEffect(() => setShown(defaultOpen), [defaultOpen]);
  // Les réglages (type de page, ordre dans le menu, Google…) sont rangés à part, en dernier.
  const isSetting = ([k, f]: [string, any]) => f.kind === 'form' && (!!f.options || typeof value?.[k] === 'number' || /Google|menu/i.test(f.label ?? ''));
  const loose = groups.filter(([, f]) => f.kind !== 'object' && f.kind !== 'array').filter((g) => !isSetting(g));
  const settings = groups.filter(([, f]) => f.kind !== 'object' && f.kind !== 'array').filter(isSetting);
  const parts: [string, any][] = [...groups.filter(([, f]) => f.kind === 'object' || f.kind === 'array')];
  if (settings.length) parts.push(['__reglages', { kind: 'object', label: 'Réglages de la page', fields: Object.fromEntries(settings) }]);
  return (
    <div className={`entry${shown ? ' open' : ''}`}>
      <button className="entry-head" onClick={() => setShown(!shown)}>
        <span>{entry.label}</span>
        {changed && <span className="dot" title="Modifiée" />}
        <span className="chev">{shown ? '▴' : '▾'}</span>
      </button>
      {shown && (
        <div className="entry-body">
          {loose.length > 0 && (
            <div className="part open">
              {loose.map(([k, f]) => <FieldView key={k} field={f} value={value?.[k]} path={[k]} ctx={ctx} />)}
            </div>
          )}
          {parts.map(([k, f]) => (
            <div key={k} className={`part${open === k ? ' open' : ''}`}>
              <button className="part-head" onClick={() => setOpen(open === k ? null : k)}>
                <span>{f.label}</span><span className="chev">{open === k ? '−' : '+'}</span>
              </button>
              {open === k && (
                <div className="part-body">
                  {k === '__reglages'
                    ? <div className="f-group">{Object.entries(f.fields).map(([n, sf]) => <FieldView key={n} field={sf} value={value?.[n]} path={[n]} ctx={ctx} />)}</div>
                    : <FieldView field={f} value={value?.[k]} path={[k]} ctx={ctx} label="" />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
