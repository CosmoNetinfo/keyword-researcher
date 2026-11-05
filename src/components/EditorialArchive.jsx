import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { downloadMarkdown } from "../utils/exportNews";
import { noteLinks } from "../utils/archiveLinks";

const FIELD = "w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
const BUTTON = "min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50";
const EMPTY = { id: "", title: "", markdown: "", tags: [], links: [] };

export default function EditorialArchive({ initialNote, onConsumeDraft, context }) {
  if (import.meta.env.VITE_EDITORIAL_ARCHIVE_ENABLED !== "true") {
    return (
      <section className="mx-auto max-w-6xl space-y-3">
        <h2 className="text-2xl font-extrabold text-slate-900">Archivio editoriale</h2>
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          L’archivio sarà disponibile dopo la configurazione dell’accesso Google e delle regole Firestore.
        </p>
      </section>
    );
  }
  return <AuthenticatedArchive initialNote={initialNote} onConsumeDraft={onConsumeDraft} context={context} />;
}

function AuthenticatedArchive({ initialNote, onConsumeDraft, context }) {
  const [account, setAccount] = useState(undefined);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  useEffect(() => onAuthStateChanged(auth, setAccount, error => {
    setError(error.message);
    setAccount(null);
  }), []);

  async function connect() {
    setError("");
    setConnecting(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      setError(error.message);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <h2 className="text-2xl font-extrabold text-slate-900">Archivio editoriale</h2>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {account === undefined ? <p role="status">Verifica dell’accesso…</p> : account ? (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="break-all">{account.email}</span>
            <button type="button" className={BUTTON} onClick={() => signOut(auth).catch(error => setError(error.message))}>Esci dall’archivio</button>
          </div>
          <McpContext key={account.uid} uid={account.uid} context={context} />
          <ArchiveNotes key={account.uid} uid={account.uid} initialNote={initialNote} onConsumeDraft={onConsumeDraft} />
        </>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Accedi con Google per salvare e ritrovare le tue note Markdown.</p>
          <button type="button" className={BUTTON} onClick={connect} disabled={connecting}>Accedi con Google</button>
        </div>
      )}
    </section>
  );
}

function ArchiveNotes({ uid, initialNote, onConsumeDraft }) {
  const linkedNoteId = useRef(initialNote ? null : new URLSearchParams(window.location.search).get("nota"));
  const [notes, setNotes] = useState([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState(() => ({ ...EMPTY, ...initialNote }));
  const [tags, setTags] = useState(() => initialNote?.tags?.join(", ") || "");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => onSnapshot(collection(db, "archivio_editoriale", uid, "note"), snapshot => {
    const entries = snapshot.docs.map(note => ({ ...note.data(), id: note.id }));
    entries.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    setNotes(entries);
    const target = linkedNoteId.current && entries.find(note => note.id === linkedNoteId.current);
    if (target) {
      linkedNoteId.current = null;
      setDraft(target);
      setTags(target.tags.join(", "));
    }
    setReady(true);
  }, error => {
    setReady(false);
    setError(`Archivio non accessibile. ${error.message}`);
  }), [uid]);

  const matches = notes.filter(note => [note.title, note.markdown, ...note.tags].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const links = noteLinks(draft.markdown, notes, draft.links);
  const outgoing = notes.filter(note => links.some(link => link.id === note.id));
  const incoming = useMemo(() => draft.id ? notes.filter(note =>
    note.id !== draft.id && noteLinks(note.markdown, notes, note.links).some(link => link.id === draft.id)
  ) : [], [notes, draft.id]);

  function openNote(note) {
    linkedNoteId.current = null;
    setDraft(note);
    setTags(note.tags.join(", "));
    setMessage("");
    setError("");
    onConsumeDraft();
  }

  async function importMarkdown(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      if (!/\.md$/i.test(file.name)) throw new Error("Scegli un file .md.");
      if (file.size > 200_000) throw new Error("Il file Markdown supera 200 KB.");
      const markdown = await file.text();
      openNote({ ...EMPTY, title: file.name.replace(/\.md$/i, ""), markdown, source: "importazione" });
      setMessage("File caricato. Salva la nota per aggiungerla all’archivio.");
    } catch (error) {
      setError(error.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!draft.title.trim() || !ready || saving) return;
    setMessage("");
    setError("");
    setSaving(true);
    try {
      if (new Blob([draft.markdown]).size > 200_000) throw new Error("La nota Markdown supera 200 KB.");
      const data = {
        title: draft.title.trim(),
        markdown: draft.markdown,
        tags: [...new Set(tags.split(",").map(tag => tag.trim()).filter(Boolean))],
        links,
        source: draft.source || "manuale",
        updatedAt: serverTimestamp(),
      };
      const path = collection(db, "archivio_editoriale", uid, "note");
      const id = draft.id || (await addDoc(path, { ...data, createdAt: serverTimestamp() })).id;
      if (draft.id) await updateDoc(doc(path, id), data);
      setDraft({ ...data, id });
      onConsumeDraft();
      setMessage("Nota salvata.");
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <button type="button" className={BUTTON} disabled={saving} onClick={() => openNote(EMPTY)}>Nuova nota</button>
        <label className="block text-sm font-medium">Importa Markdown
          <input type="file" accept=".md,text/markdown" onChange={importMarkdown} disabled={saving}
            className="block w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:border-0 file:bg-indigo-50 file:px-2" />
        </label>
        <label className="block text-sm font-medium">Cerca per titolo, testo o tag
          <input type="search" className={FIELD} value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        <ul className="max-h-80 space-y-1 overflow-auto">
          {matches.map(note => (
            <li key={note.id}>
              <button type="button" className="w-full rounded-lg px-2 py-2 text-left text-sm text-indigo-800 hover:bg-indigo-50 [overflow-wrap:anywhere]"
                aria-current={draft.id === note.id ? "true" : undefined} disabled={saving} onClick={() => openNote(note)}>
                {note.title}
              </button>
            </li>
          ))}
        </ul>
        {ready && matches.length === 0 && <p className="text-sm text-slate-600">Nessuna nota trovata.</p>}
      </div>
      <form onSubmit={save} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <fieldset disabled={saving} className="min-w-0 space-y-3">
          <label className="block text-sm font-medium">Titolo
            <input className={FIELD} value={draft.title} required maxLength={200}
              onChange={event => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">Tag separati da virgola
            <input className={FIELD} value={tags} maxLength={500} onChange={event => setTags(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">Testo Markdown
            <textarea className={`${FIELD} min-h-64 font-mono`} value={draft.markdown}
              onChange={event => setDraft({ ...draft, markdown: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">Collega una nota
            <select className={FIELD} value="" onChange={event => {
              const target = notes.find(note => note.id === event.target.value);
              if (target) setDraft({ ...draft, markdown: `${draft.markdown}\n[[${target.id}|${target.title.replace(/[[\]|]/g, "") || "Nota"}]]\n` });
            }}>
              <option value="">Scegli una nota da inserire</option>
              {notes.filter(note => note.id !== draft.id).map(note => <option key={note.id} value={note.id}>{note.title}</option>)}
            </select>
          </label>
          <p className="text-xs text-slate-600">Puoi anche digitare [[Titolo della nota]] quando il titolo è univoco.</p>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={!ready || saving} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Salvataggio…" : "Salva nota"}
          </button>
          <button type="button" className={BUTTON} disabled={!draft.markdown} onClick={() => downloadMarkdown(
            draft.markdown, `${draft.title.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-") || "nota"}.md`
          )}>Scarica .md</button>
        </div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
        {[["Collegamenti", outgoing], ["Backlink", incoming]].map(([label, list]) => (
          <div key={label} className="text-sm">
            <h3 className="font-semibold">{label}</h3>
            {list.length ? <ul className="space-y-1">{list.map(note => (
              <li key={note.id}><button type="button" disabled={saving} onClick={() => openNote(note)}
                className="text-left text-indigo-700 underline [overflow-wrap:anywhere]">{note.title}</button></li>
            ))}</ul> : <p className="text-slate-600">Nessuna nota collegata.</p>}
          </div>
        ))}
      </form>
    </div>
  );
}

function McpContext({ uid, context }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selection, setSelection] = useState({ trend: false, gsc: false });

  async function update(remove = false) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const ref = doc(db, "archivio_editoriale", uid, "contesto", "mcp");
      const data = {};
      if (remove || selection.trend) {
        data.trend = remove ? null : {
          sharedAt: serverTimestamp(),
          feeds: context.feeds.map(({ name, url }) => ({ name: name.slice(0, 150), domain: new URL(url).hostname })).slice(0, 100),
          hours: context.hours,
          report: context.trend && {
            fetchedAt: context.trend.fetchedAt,
            items: context.trend.items.map(({ title, url, date, sourceName }) => ({
              title: title.slice(0, 500), url: url.slice(0, 1500), date: date || null, sourceName: sourceName.slice(0, 150),
            })),
          },
        };
      }
      if (remove || selection.gsc) {
        data.gsc = remove ? null : { sharedAt: serverTimestamp(), report: context.gsc, opportunities: context.seo };
      }
      await setDoc(ref, data, { mergeFields: Object.keys(data) });
      setMessage(remove ? "I dati condivisi sono stati rimossi." : "Dati condivisi con il connettore MCP.");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold">Dati condivisi con MCP</summary>
      <p className="text-sm text-slate-600">Scegli quali dati della sessione condividere con il connettore. Le copie si aggiornano quando le condividi di nuovo.</p>
      <fieldset className="space-y-2 text-sm" disabled={busy}>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={selection.trend} onChange={event => setSelection({ ...selection, trend: event.target.checked })} />
          Fonti RSS e notizie caricate
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={selection.gsc} disabled={!context.gsc && !context.seo}
            onChange={event => setSelection({ ...selection, gsc: event.target.checked })} />
          Metriche e opportunità di Search Console
        </label>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} disabled={busy || (!selection.trend && !selection.gsc)}
          onClick={() => update()}>Condividi dati selezionati</button>
        <button type="button" className={BUTTON} disabled={busy} onClick={() => update(true)}>Rimuovi dati condivisi</button>
      </div>
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </details>
  );
}
