// Éditeur visuel du site : la page s'affiche en grand, on clique sur un texte pour l'écrire, et les boutons
// « + » et « − » de la page ajoutent ou retirent éléments, blocs et articles. Ce qui ne se voit pas à l'écran
// (Google, couleurs de fond, réglages) est dans la fenêtre « Réglages ». « Publier » enregistre tout.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { attachInline, getAt, type BlogItem, type ListOp } from './inline';
import { computeVars } from './markup';
import { BLOCK_FIELD, blockLabel, entriesForUrl, pickerPages, POST_SCHEMA, type Entry, type Path } from './schema';
import { AuthError, ConflictError, currentUser, load, login, logout, ONLINE, save, type Loaded, type User } from './source';
import { FieldView, type FieldCtx } from './Fields';
import { BLOG_DIR, isNewPost, isPost, newPost, parsePost, POST_SETTINGS, postSlug, serializePost, slugify } from './posts';

type Files = Record<string, any>;
type Ops = Record<string, { path: Path; op: ListOp }[] | null>;
type Status = 'loading' | 'login' | 'noaccess' | 'ready' | 'error';
type Dialog = null | { kind: 'page' } | { kind: 'block'; file: string; index: number } | { kind: 'post'; file: string };
const DRAFT_KEY = 'stagnum-edition-brouillon';

// Contenu d'un fichier tel qu'il est enregistré (null : fichier absent ou supprimé).
const serialize = (p: string, v: any): string | null =>
  v === null || v === undefined ? null : isPost(p) ? serializePost(v) : JSON.stringify(v, null, 2) + '\n';

function setAt(obj: any, path: Path, value: any): any {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  copy[k as any] = setAt(obj?.[k as any], rest, value);
  return copy;
}

const readDraft = (): { texts: Record<string, string>; files: Files; ops?: Ops } | null => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null'); } catch { return null; }
};

export default function App() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [base, setBase] = useState<Files>({});
  const [files, setFiles] = useState<Files>({});
  const [ops, setOps] = useState<Ops>({});
  const [url, setUrl] = useState(() => new URLSearchParams(location.search).get('page') || '/');
  const [postView, setPostView] = useState<string | null>(null); // article pas encore publié, affiché dans la page
  const [frameKey, setFrameKey] = useState(0);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [tab, setTab] = useState<'page' | 'site'>('page');
  const [ready, setReady] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [toast, setToast] = useState<{ text: string; kind?: 'ok' | 'err' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  // Mode navigation par défaut : on parcourt le site comme un visiteur. « Modifier » rend les textes modifiables.
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(editing);
  // Position de lecture à restaurer après un basculement Naviguer/Modifier (l'aperçu se recharge).
  const keepScroll = useRef<number | null>(null);
  const setMode = (on: boolean) => {
    if (editingRef.current === on) return;
    editingRef.current = on;
    // On garde la position de défilement : rien ne doit remonter en haut de la page.
    keepScroll.current = frame.current?.contentWindow?.scrollY ?? null;
    setEditing(on);
    setFrameKey((k) => k + 1);
  };
  const frame = useRef<HTMLIFrameElement>(null);
  const src = useRef(url);
  const inline = useRef<ReturnType<typeof attachInline> | null>(null);
  const filesRef = useRef(files);
  const baseRef = useRef(base);
  const opsRef = useRef(ops);
  baseRef.current = base;

  const say = (text: string, kind?: 'ok' | 'err') => {
    setToast({ text, kind });
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), kind === 'err' ? 8000 : 4500);
  };

  // Les contenus sont mis à jour tout de suite (la page en a besoin sans attendre React).
  const commit = (next: Files) => { filesRef.current = next; setFiles(next); };
  const commitOps = (next: Ops) => { opsRef.current = next; setOps(next); };

  /* ---------- Chargement ---------- */

  const start = useCallback(async () => {
    setStatus('loading');
    try {
      if (ONLINE) setUser(await currentUser());
      const l = await load();
      const parsed: Files = {};
      for (const [p, t] of Object.entries(l.texts)) {
        if (p.endsWith('.json')) parsed[p] = JSON.parse(t);
        else if (isPost(p)) parsed[p] = parsePost(t);
      }
      setLoaded(l);
      setBase(parsed);
      baseRef.current = parsed;
      // Brouillon gardé dans ce navigateur : on le reprend pour les fichiers qui n'ont pas changé depuis.
      const d = readDraft();
      const merged = { ...parsed };
      const keptOps: Ops = {};
      if (d) for (const [p, v] of Object.entries(d.files)) {
        if (d.texts[p] !== l.texts[p]) continue;
        merged[p] = v;
        if (d.ops && p in d.ops) keptOps[p] = d.ops[p];
      }
      commit(merged);
      commitOps(keptOps);
      setStatus('ready');
    } catch (e) {
      if (e instanceof AuthError) setStatus(e.message === 'no-access' ? 'noaccess' : 'login');
      else { setError(String((e as Error).message ?? e)); setStatus('error'); }
    }
  }, []);
  useEffect(() => { start(); }, [start]);

  const changed = useMemo(
    () => [...new Set([...Object.keys(files), ...Object.keys(base)])].filter((p) => serialize(p, files[p]) !== serialize(p, base[p])),
    [files, base],
  );

  // Brouillon enregistré dans le navigateur à chaque modification.
  useEffect(() => {
    if (status !== 'ready' || !loaded) return;
    try {
      if (!changed.length) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({
        texts: Object.fromEntries(changed.map((p) => [p, loaded.texts[p]])),
        files: Object.fromEntries(changed.map((p) => [p, files[p] ?? null])),
        ops: Object.fromEntries(changed.filter((p) => p in ops).map((p) => [p, ops[p]])),
      }));
    } catch {}
  }, [files, ops, changed, status, loaded]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (changed.length) e.preventDefault(); };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [changed.length]);

  const vars = useMemo(() => computeVars(files), [files]);

  /* ---------- Modifications ---------- */

  // from : 'page' quand on écrit dans la page, 'dialog' quand on passe par la fenêtre « Réglages ».
  const change = (file: string, path: Path, value: any, from: 'page' | 'dialog') => {
    commit({ ...filesRef.current, [file]: setAt(filesRef.current[file], path, value) });
    if (from === 'page') return;
    if (path[0] === 'blocks' && !isPost(file)) inline.current?.blocksChanged();
    else if (Array.isArray(value)) {
      // Liste modifiée dans la fenêtre : la page la montrera après publication.
      commitOps({ ...opsRef.current, [file]: null });
    } else if (typeof value === 'string') inline.current?.update(file, path, value);
  };

  const listOp = (file: string, path: Path, op: ListOp) => {
    const f = filesRef.current;
    const arr = [...(getAt(f[file], path) as any[])];
    const i = op.index;
    if (op.type === 'duplicate') arr.splice(i + 1, 0, structuredClone(arr[i]));
    if (op.type === 'remove') arr.splice(i, 1);
    if (op.type === 'up') [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    if (op.type === 'down') [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    commit({ ...f, [file]: setAt(f[file], path, arr) });
    // Retenu pour pouvoir le rejouer si on revient sur la page avant de publier (les blocs se redessinent seuls).
    if (path[0] !== 'blocks') {
      const prev = opsRef.current[file];
      if (prev !== null) commitOps({ ...opsRef.current, [file]: [...(prev ?? []), { path, op }] });
    }
  };

  /* ---------- Articles du blog ---------- */

  const blogItems = (): BlogItem[] => {
    const f = filesRef.current, b = baseRef.current;
    return [...new Set([...Object.keys(f), ...Object.keys(b)])].filter(isPost).map((p) => {
      const v = f[p] ?? b[p] ?? {};
      return {
        file: p, url: `/blog/${postSlug(p)}/`, h1: v.h1 ?? '', description: v.description ?? '', tag: v.tag ?? '', date: String(v.date ?? ''),
        status: f[p] === null || f[p] === undefined ? 'deleted' : b[p] ? 'base' : 'new',
      };
    });
  };

  // Un article pas encore publié s'affiche dans la mise en page d'un article existant.
  const shellUrl = () => {
    const p = Object.keys(baseRef.current).find(isPost);
    return p ? `/blog/${postSlug(p)}/` : null;
  };

  const go = (u: string) => {
    setPicker(false);
    if (u.startsWith('article:')) return openPost(u.slice('article:'.length));
    src.current = u;
    setFrameKey((k) => k + 1);
  };

  const openPost = (file: string) => {
    if (!isNewPost(file) && baseRef.current[file]) return go(`/blog/${postSlug(file)}/`);
    const shell = shellUrl();
    if (!shell) return say('Il faut au moins un article publié pour en créer un nouveau ici.', 'err');
    src.current = `${shell}?ed-article=${encodeURIComponent(file)}`;
    // Un article pas encore publié n'existe que dans l'éditeur : il s'ouvre en mode « Modifier ».
    editingRef.current = true;
    setEditing(true);
    setFrameKey((k) => k + 1);
  };

  const addPost = () => {
    let n = 1;
    while (filesRef.current[`${BLOG_DIR}__nouveau-${n}.md`] !== undefined) n++;
    const file = `${BLOG_DIR}__nouveau-${n}.md`;
    commit({ ...filesRef.current, [file]: newPost() });
    openPost(file);
    say('Nouvel article : cliquez sur le titre, le résumé et le texte pour les écrire. La date et l’icône sont dans « Réglages ».', 'ok');
  };

  const removePost = (file: string) => {
    const next = { ...filesRef.current };
    if (baseRef.current[file]) next[file] = null;
    else delete next[file];
    commit(next);
    // On était sur la page de cet article : retour au blog.
    if (src.current.includes(`ed-article=${encodeURIComponent(file)}`) || src.current.startsWith(`/blog/${postSlug(file)}/`)) go('/blog/');
  };

  /* ---------- Page affichée ---------- */

  useEffect(() => {
    if (status === 'ready' && frame.current) { setReady(false); frame.current.src = src.current; }
  }, [frameKey, status]);

  const onFrameLoad = () => {
    const win = frame.current?.contentWindow;
    const doc = frame.current?.contentDocument;
    if (!win || !doc || doc.location.href === 'about:blank') return;
    // Après un basculement Naviguer/Modifier, on revient à la position de lecture (pas en haut).
    if (keepScroll.current != null) {
      const y = keepScroll.current;
      keepScroll.current = null;
      const back = () => win.scrollTo(0, y);
      back();
      win.requestAnimationFrame(back);
      win.setTimeout(back, 350);
    }
    const path = win.location.pathname;
    const virt = new URLSearchParams(win.location.search).get('ed-article');
    const view = virt && filesRef.current[virt] ? virt : null;
    src.current = path + win.location.search;
    setPostView(view);
    setUrl(view ? '/blog/' : path);
    history.replaceState(null, '', `?page=${encodeURIComponent(view ? '/blog/' : path)}`);
    const f = filesRef.current;
    const { own, site } = entriesForUrl(path, f);
    const ownPost = view ?? own.find((e) => isPost(e.id))?.id ?? null;
    const textOwn = view ? [] : own.filter((e) => !isPost(e.id));
    if (!editingRef.current && !view) {
      // Les liens vers d'autres sites s'ouvrent dans un nouvel onglet, pas dans l'aperçu.
      doc.addEventListener('click', (e) => {
        const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
        if (a && new URL(a.href, win.location.href).origin !== win.location.origin) { e.preventDefault(); window.open(a.href, '_blank', 'noopener'); }
      });
      inline.current = null;
      setSkipped([]);
      setReady(true);
      return;
    }
    // Les textes s'attachent une fois la page prête (polices et animations d'entrée comprises).
    win.setTimeout(() => {
      inline.current = attachInline(doc, {
        entries: [...textOwn, ...site],
        base: baseRef.current,
        getFiles: () => filesRef.current,
        onChange: (file, p, v) => change(file, p, v, 'page'),
        onList: listOp,
        replay: opsRef.current,
        blocksFile: textOwn.find((e) => e.schema.blocks)?.id ?? null,
        onBlockSettings: (file, index) => setDialog({ kind: 'block', file, index }),
        post: ownPost ? { file: ownPost, fill: !!view || f[ownPost]?.content !== baseRef.current[ownPost]?.content } : null,
        blog: path === '/blog/' ? { items: blogItems(), onAdd: addPost, onRemove: removePost, onOpen: openPost } : null,
        onError: (m) => say(m, 'err'),
      });
      setSkipped(inline.current.skipped);
      setReady(true);
    }, 300);
  };

  /* ---------- Publication ---------- */

  const labelOf = (p: string) => {
    if (isPost(p)) return `article « ${(files[p] ?? base[p])?.h1 ?? postSlug(p)} »`;
    return entriesForUrl('/', files).own.concat(entriesForUrl('/', files).site).find((e) => e.id === p)?.label
      ?? [...entriesForUrl(url, files).own].find((e) => e.id === p)?.label
      ?? (p.startsWith('src/content/pages/') ? files[p]?.nav : p.split('/').pop()?.replace('.json', ''));
  };

  const publish = async () => {
    if (!loaded || !changed.length) return;
    setBusy(true);
    try {
      // Un nouvel article prend son adresse d'après son titre.
      const changes: Record<string, string | null> = {};
      const renamed: Record<string, string> = {};
      for (const p of changed) {
        if (!isNewPost(p)) { changes[p] = serialize(p, files[p]); continue; }
        const slug = slugify(files[p].h1 ?? '');
        let q = `${BLOG_DIR}${slug}.md`;
        for (let n = 2; base[q] !== undefined || files[q] || q in changes; n++) q = `${BLOG_DIR}${slug}-${n}.md`;
        changes[q] = serialize(q, files[p]);
        renamed[p] = q;
      }
      const names = [...new Set(changed.map(labelOf))].join(', ');
      await save(changes, loaded, `Met à jour le contenu du site : ${names}`);
      localStorage.removeItem(DRAFT_KEY);
      say(ONLINE ? 'Publié ! Le site se met à jour tout seul d’ici une à deux minutes.' : 'Enregistré. La page se met à jour.', 'ok');
      await start();
      const viewed = postView && renamed[postView];
      if (viewed) go(ONLINE ? '/blog/' : `/blog/${postSlug(viewed)}/`);
      else setFrameKey((k) => k + 1);
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
    commit(base);
    commitOps({});
    localStorage.removeItem(DRAFT_KEY);
    if (postView) go('/blog/');
    else setFrameKey((k) => k + 1);
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

  const { own, site } = entriesForUrl(url, files);
  const pages = pickerPages(files);
  const currentPost = postView ?? own.find((e) => isPost(e.id))?.id ?? null;
  const current = currentPost ? files[currentPost]?.h1 ?? 'Article' : pages.flatMap((g) => g.items).find((i) => i.url === url)?.label ?? url;
  const fieldCtx = (id: string): FieldCtx => ({
    file: id,
    vars,
    focusKey: null,
    onChange: (p, v) => change(id, p, v, 'dialog'),
    onReveal: (p) => { const ok = inline.current?.reveal(id, p) ?? false; if (ok) setDialog(null); return ok; },
  });
  const pageEntries = own.filter((e) => !isPost(e.id));

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
                    {g.items.map((i) => {
                      const file = i.url.startsWith('article:') ? i.url.slice(8) : null;
                      const on = file ? postView === file : !postView && i.url === url;
                      const dirty = file ? changed.includes(file) : changed.some((p) => entriesForUrl(i.url, files).own.some((e) => e.id === p));
                      return (
                        <button key={i.url} className={on ? 'on' : ''} onClick={() => go(i.url)}>
                          {i.label}
                          {dirty && <span className="dot" title="Modifiée" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mode" role="group" aria-label="Mode">
          <button className={!editing ? 'on' : ''} onClick={() => setMode(false)} title="Parcourir le site en cliquant sur les liens">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l7 17 2.5-7.5L21 11z" /></svg>
            Naviguer
          </button>
          <button className={editing ? 'on' : ''} onClick={() => setMode(true)} title="Cliquer sur les textes pour les modifier">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></svg>
            Modifier
          </button>
        </div>

        <button className="btn settings" onClick={() => setDialog(currentPost ? { kind: 'post', file: currentPost } : { kind: 'page' })} title="Référencement Google, réglages, tout ce qui ne se voit pas dans la page">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
          Réglages
        </button>

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

      <main className={`stage ${device}`}>
        <div className="hint">
          <span className="pulse" />
          {!ready ? 'Chargement de la page…'
            : !editing && !postView ? <>Mode navigation : cliquez sur les liens pour parcourir le site. Passez en <b>Modifier</b> pour changer les textes.{changed.length > 0 && <span className="warn">Vos modifications non publiées s’affichent en mode « Modifier ».</span>}</>
            : <>Cliquez sur un texte pour l’écrire. Survolez un élément : <b className="k plus">+</b> en ajoute un, <b className="k minus">−</b> le retire.</>}
          {ready && (editing || postView) && skipped.length > 0 && <span className="warn">Les textes de {skipped.map((p) => `« ${labelOf(p)} »`).join(', ')} se modifient dans « Réglages » jusqu’à la prochaine publication.</span>}
        </div>
        <div className="frame-wrap">
          <iframe key={frameKey} ref={frame} onLoad={onFrameLoad} title="Aperçu du site" />
        </div>
      </main>

      {dialog && (
        <div className="dialog-veil" onMouseDown={(e) => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="dialog" role="dialog" aria-modal="true">
            {dialog.kind === 'block' && (() => {
              const b = files[dialog.file]?.blocks?.[dialog.index];
              if (!b) return null;
              return (
                <>
                  <DialogHead title={`Bloc « ${blockLabel(b.discriminant)} »`} onClose={() => setDialog(null)} />
                  <div className="dialog-body">
                    <p className="panel-intro">Les textes se modifient aussi directement dans la page. Ici : la couleur de fond, les icônes, les liens.</p>
                    <FieldView field={BLOCK_FIELD.element.values[b.discriminant]} value={b.value} path={['blocks', dialog.index, 'value']} ctx={fieldCtx(dialog.file)} label="" />
                  </div>
                </>
              );
            })()}
            {dialog.kind === 'post' && files[dialog.file] && (
              <>
                <DialogHead title="Réglages de l’article" onClose={() => setDialog(null)} />
                <div className="dialog-body">
                  <PostSettings value={files[dialog.file]} onChange={(k, v) => change(dialog.file, [k], v, 'dialog')} />
                  <div className="danger-zone">
                    <button className="btn danger" onClick={() => { if (confirm(`Supprimer l’article « ${files[dialog.file].h1} » ?\nIl sera retiré du site à la publication.`)) { removePost(dialog.file); setDialog(null); } }}>− Supprimer l’article</button>
                  </div>
                </div>
              </>
            )}
            {dialog.kind === 'page' && (
              <>
                <DialogHead title="Réglages" onClose={() => setDialog(null)} />
                <div className="tabs">
                  <button className={tab === 'page' ? 'on' : ''} onClick={() => setTab('page')}>Cette page</button>
                  <button className={tab === 'site' ? 'on' : ''} onClick={() => setTab('site')}>Tout le site</button>
                </div>
                <div className="dialog-body">
                  {tab === 'page' && <p className="panel-intro">Le référencement Google et tout ce qui ne se voit pas dans la page. Les textes visibles se modifient directement dans la page.</p>}
                  {tab === 'site' && <p className="panel-intro">Ce qui revient sur plusieurs pages : le menu, les boutons, le formulaire, les prix des briques…</p>}
                  {tab === 'page' && !pageEntries.length && <p className="panel-intro">Cette page n’a pas de réglages à elle : voyez « Tout le site ».</p>}
                  {(tab === 'page' ? pageEntries : site).map((e) => (
                    <EntryView key={e.id} entry={e} value={files[e.id]} ctx={fieldCtx(e.id)} changed={changed.includes(e.id)} defaultOpen={tab === 'page' && pageEntries.length === 1} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.kind ?? ''}`}>{toast.text}</div>}
    </div>
  );
}

function DialogHead({ title, onClose }: { title: string; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="dialog-head">
      <h2>{title}</h2>
      <button className="close" onClick={onClose} title="Fermer" autoFocus>✕</button>
    </div>
  );
}

// Réglages d'un article : date, temps de lecture, icône, Google…
function PostSettings({ value, onChange }: { value: any; onChange: (k: string, v: any) => void }) {
  const selects = [
    { key: 'icon', label: 'Icône', help: 'Affichée dans « À lire aussi ».', options: POST_SCHEMA.icon.options },
    { key: 'color', label: 'Couleur de l’icône', options: POST_SCHEMA.color.options },
  ];
  return (
    <div className="f-group">
      {POST_SETTINGS.map((s) => (
        <label key={s.key} className="f">
          <span className="f-label">{s.label}</span>
          {s.type === 'textarea'
            ? <textarea className="f-input" rows={3} value={value[s.key] ?? ''} onChange={(e) => onChange(s.key, e.target.value)} />
            : <input className={`f-input${s.type === 'number' ? ' f-num' : ''}`} type={s.type} value={value[s.key] ?? ''} onChange={(e) => onChange(s.key, s.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />}
          {s.help && <span className="f-help">{s.help}</span>}
        </label>
      ))}
      {selects.map((s) => (
        <label key={s.key} className="f">
          <span className="f-label">{s.label}</span>
          <select className="f-select" value={value[s.key] ?? ''} onChange={(e) => onChange(s.key, e.target.value)}>
            {s.options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {s.help && <span className="f-help">{s.help}</span>}
        </label>
      ))}
    </div>
  );
}

// Une rubrique : ses grandes parties (groupes) se replient.
function EntryView({ entry, value, ctx, changed, defaultOpen }: { entry: Entry; value: any; ctx: FieldCtx; changed: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(defaultOpen);
  const groups = Object.entries(entry.schema);
  useEffect(() => setShown(defaultOpen), [defaultOpen]);
  // Les réglages (type de page, ordre dans le menu, Google…) sont rangés à part, en premier.
  const isSetting = ([k, f]: [string, any]) => f.kind === 'form' && (!!f.options || typeof value?.[k] === 'number' || /Google|menu/i.test(f.label ?? ''));
  const loose = groups.filter(([, f]) => f.kind !== 'object' && f.kind !== 'array').filter((g) => !isSetting(g));
  const settings = groups.filter(([, f]) => f.kind !== 'object' && f.kind !== 'array').filter(isSetting);
  const parts: [string, any][] = [];
  if (settings.length) parts.push(['__reglages', { kind: 'object', label: 'Réglages de la page', fields: Object.fromEntries(settings) }]);
  parts.push(...groups.filter(([, f]) => f.kind === 'object' || f.kind === 'array'));
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
