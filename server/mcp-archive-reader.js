import { google } from "googleapis";

const NOTE_ID = /^[a-zA-Z0-9]{20}$/;
const MAX_SCAN = 1000;

export function createArchiveReader({ projectId, uid, serviceAccount }) {
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  const root = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const owner = `${root}/archivio_editoriale/${encodeURIComponent(uid)}`;
  const path = `${owner}/note`;

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

  async function list(collectionId, fields, order, limit, where) {
    const { data } = await auth.request({
      url: `${root}:runQuery`, method: "POST", timeout: 8000,
      data: { structuredQuery: {
        from: [{ collectionId }], select: { fields: fields.map(fieldPath => ({ fieldPath })) },
        orderBy: [{ field: { fieldPath: order }, direction: "DESCENDING" }],
        ...(where && { where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: where } } } }),
        limit,
      } },
    });
    return data.filter(row => row.document).map(row => readFields(row.document));
  }

  async function context(section) {
    if (section !== "trend" && section !== "gsc") return null;
    try {
      const { data } = await auth.request({ url: `${owner}/contesto/mcp`, timeout: 8000 });
      const snapshot = readFields(data);
      return snapshot[section] || null;
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  return {
    search, get, links, context,
    listPlan: (limit, status) => list("piano_editoriale",
      ["title", "status", "cat", "tipo", "month", "year", "existingUrl", "sourceUrl", "kw"], "createdAt", limit, status),
    listAnalyses: limit => list("analyses", ["date", "url", "topic"], "date", limit),
    async getAnalysis(id) {
      if (!NOTE_ID.test(id)) return null;
      try {
        const { data } = await auth.request({ url: `${root}/analyses/${id}`, timeout: 8000 });
        const { date, url, topic, result } = readFields(data);
        const serialized = JSON.stringify(result || {});
        return { id, date, url, topic, result: serialized.length <= 50_000 ? result : null,
          truncated: serialized.length > 50_000 };
      } catch (error) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
  };
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

function readFields({ name, fields = {} }) {
  return { ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, readValue(value)])),
    id: name.split("/").at(-1) };
}

function readValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return values(value).map(readValue);
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(
    ([key, item]) => [key, readValue(item)]
  ));
  return null;
}
