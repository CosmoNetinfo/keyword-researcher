import { google } from "googleapis";

const NOTE_ID = /^[a-zA-Z0-9]{20}$/;
const MAX_SCAN = 1000;

export function createArchiveReader({ projectId, uid, serviceAccount }) {
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  const path = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/archivio_editoriale/${encodeURIComponent(uid)}/note`;

  async function get(id) {
    if (!NOTE_ID.test(id)) return null;
    try {
      const { data } = await auth.request({ url: `${path}/${id}`, timeout: 8000 });
      return readNote(data);
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async function search(query, limit) {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = [];
    let pageToken;
    let scanned = 0;
    do {
      const { data } = await auth.request({
        url: path,
        params: { pageSize: Math.min(100, MAX_SCAN - scanned), pageToken, orderBy: "updatedAt desc" },
        timeout: 8000,
      });
      pageToken = data.nextPageToken;
      for (const document of data.documents || []) {
        scanned++;
        const note = readNote(document);
        const text = [note.title, ...note.tags, note.markdown].join(" ").toLowerCase();
        if (terms.every(term => text.includes(term))) matches.push(summary(note));
        if (matches.length >= limit) return { notes: matches, truncated: true };
      }
    } while (pageToken && scanned < MAX_SCAN);
    return { notes: matches, truncated: Boolean(pageToken) };
  }

  async function links(id) {
    const note = await get(id);
    if (!note) return null;
    const ids = [...new Set(note.linkIds)].slice(0, 20);
    const linked = await Promise.all(ids.map(get));
    return { notes: linked.filter(Boolean).map(summary), truncated: note.linkIds.length > ids.length };
  }

  return { search, get, links };
}

function values(field) {
  return field?.arrayValue?.values || [];
}

function readNote({ name, fields = {} }) {
  return {
    id: name.split("/").at(-1),
    title: fields.title?.stringValue || "",
    markdown: fields.markdown?.stringValue || "",
    tags: values(fields.tags).map(value => value.stringValue).filter(Boolean),
    linkIds: values(fields.links).map(value => value.mapValue?.fields?.id?.stringValue).filter(Boolean),
    updatedAt: fields.updatedAt?.timestampValue || null,
  };
}

function summary({ id, title, tags, updatedAt }) {
  return { id, title, tags, updatedAt };
}
