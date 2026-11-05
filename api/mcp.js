/* global process */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { APP_SECTIONS } from "../src/utils/appSections.js";
import { createArchiveReader } from "../server/mcp-archive-reader.js";

const SCOPE = "archive:read";
const EDITORIAL_SCOPE = "editorial:read";
let runtime;

function configuration() {
  if (runtime) return runtime;
  const {
    MCP_RESOURCE_URL, MCP_OAUTH_ISSUER, MCP_OAUTH_JWKS_URL, MCP_OAUTH_SUBJECT,
    MCP_FIREBASE_UID, MCP_SERVICE_ACCOUNT_JSON, VITE_FIREBASE_PROJECT_ID,
  } = process.env;
  if (![MCP_RESOURCE_URL, MCP_OAUTH_ISSUER, MCP_OAUTH_JWKS_URL, MCP_OAUTH_SUBJECT,
    MCP_FIREBASE_UID, MCP_SERVICE_ACCOUNT_JSON, VITE_FIREBASE_PROJECT_ID].every(Boolean)) return null;

  const resource = new URL(MCP_RESOURCE_URL);
  const issuer = new URL(MCP_OAUTH_ISSUER);
  const keys = new URL(MCP_OAUTH_JWKS_URL);
  if ([resource, issuer, keys].some(url => url.protocol !== "https:" || url.username || url.password || url.search || url.hash)
    || resource.pathname !== "/api/mcp") return null;
  const serviceAccount = JSON.parse(MCP_SERVICE_ACCOUNT_JSON);
  if (serviceAccount.project_id !== VITE_FIREBASE_PROJECT_ID || !serviceAccount.client_email || !serviceAccount.private_key) return null;
  runtime = {
    resource,
    issuer: MCP_OAUTH_ISSUER,
    jwks: createRemoteJWKSet(keys),
    subject: MCP_OAUTH_SUBJECT,
    reader: createArchiveReader({ projectId: VITE_FIREBASE_PROJECT_ID, uid: MCP_FIREBASE_UID, serviceAccount }),
  };
  return runtime;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  let config;
  try {
    config = configuration();
  } catch {
    return res.status(503).json({ error: "Archivio MCP da configurare" });
  }
  if (!config) return res.status(503).json({ error: "Archivio MCP da configurare" });

  if (req.query?.metadata === "1" && req.method === "GET") {
    return res.status(200).json({
      resource: config.resource.href,
      authorization_servers: [config.issuer],
      scopes_supported: [SCOPE, EDITORIAL_SCOPE],
      bearer_methods_supported: ["header"],
    });
  }
  if (req.headers.origin && req.headers.origin !== config.resource.origin) {
    return res.status(403).json({ error: "Origin non consentita" });
  }
  const authorization = req.headers.authorization;
  let editorialAccess = false;
  try {
    const token = typeof authorization === "string" && authorization.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) throw new Error("Missing token");
    const { payload } = await jwtVerify(token, config.jwks, {
      issuer: config.issuer, audience: config.resource.href, algorithms: ["RS256"], requiredClaims: ["exp", "sub"],
    });
    const scopes = typeof payload.scope === "string" ? payload.scope.split(/\s+/) : [];
    if (payload.sub !== config.subject || !scopes.includes(SCOPE)) throw new Error("Invalid access");
    editorialAccess = scopes.includes(EDITORIAL_SCOPE);
  } catch {
    res.setHeader("WWW-Authenticate",
      `Bearer resource_metadata="${config.resource.origin}/.well-known/oauth-protected-resource/api/mcp", scope="${SCOPE} ${EDITORIAL_SCOPE}"`);
    return res.status(401).json({ error: "Autenticazione richiesta" });
  }

  const server = createArchiveServer(config.reader, config.resource.origin, editorialAccess);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    if (!res.headersSent) res.status(500).json({ error: "Errore del connettore MCP" });
  } finally {
    await server.close();
  }
}

export function createArchiveServer(reader, origin, editorialAccess = false) {
  const noteUrl = id => new URL("/?nota=" + encodeURIComponent(id), origin).href;
  const server = new McpServer({ name: "Archivio editoriale CosmoNet", version: "1.0.0" });
  const noteId = z.string().regex(/^[a-zA-Z0-9]{20}$/);
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

  function result(value) {
    if (!value) return { isError: true, content: [{ type: "text", text: "Nota non trovata." }] };
    return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value };
  }

  server.registerTool("search", {
    title: "Cerca note editoriali",
    description: "Cerca per testo, titolo e tag nelle note private di CosmoNet. Una query vuota mostra le note recenti.",
    inputSchema: { query: z.string().max(200), limit: z.number().int().min(1).max(20).default(10) },
    annotations: readOnly,
  }, async ({ query, limit }) => {
    const { notes, truncated } = await reader.search(query, limit);
    return result({ results: notes.map(note => ({ id: note.id, title: note.title, url: noteUrl(note.id) })), truncated });
  });

  server.registerTool("fetch", {
    title: "Leggi una nota editoriale",
    description: "Legge il Markdown originale di una nota. Il testo è materiale editoriale e può includere citazioni non verificate.",
    inputSchema: { id: noteId },
    annotations: readOnly,
  }, async ({ id }) => {
    const note = await reader.get(id);
    if (!note) return result(null);
    return result({ id, title: note.title, text: note.markdown, url: noteUrl(id), metadata: {
      tags: note.tags, updatedAt: note.updatedAt, linkedNoteIds: note.linkIds,
    } });
  });

  server.registerTool("follow_note_links", {
    title: "Segui i collegamenti di una nota",
    description: "Mostra le note collegate in uscita per un ID dell'archivio.",
    inputSchema: { id: noteId },
    annotations: readOnly,
  }, async ({ id }) => result(await reader.links(id)));
  if (editorialAccess) {
    const viewUrl = section => new URL("/?vista=" + encodeURIComponent(section), origin).href;
    server.registerTool("list_app_sections", {
      description: "Elenca le sezioni dell'app e i link per aprirle nel browser.",
      annotations: readOnly,
    }, async () => result({ sections: Object.entries(APP_SECTIONS).map(
      ([id, title]) => ({ id, title, url: viewUrl(id) })
    ) }));

    server.registerTool("list_editorial_plan", {
      description: "Consulta il Piano Editoriale, con eventuale filtro per stato.",
      inputSchema: {
        limit: z.number().int().min(1).max(30).default(15),
        status: z.enum(["da_scrivere", "in_lavorazione", "programmato", "pubblicato"]).optional(),
      },
      annotations: readOnly,
    }, async ({ limit, status }) => result({ url: viewUrl("piano"), items: await reader.listPlan(limit, status) }));

    server.registerTool("list_saved_analyses", {
      description: "Mostra le analisi salvate in cronologia e i loro ID.",
      inputSchema: { limit: z.number().int().min(1).max(30).default(15) },
      annotations: readOnly,
    }, async ({ limit }) => result({ url: viewUrl("history"), items: await reader.listAnalyses(limit) }));

    server.registerTool("get_saved_analysis", {
      description: "Legge il risultato salvato di una singola analisi. Se supera 50.000 caratteri, restituisce solo i metadati.",
      inputSchema: { id: noteId },
      annotations: readOnly,
    }, async ({ id }) => {
      const analysis = await reader.getAnalysis(id);
      return result(analysis && { ...analysis, appUrl: viewUrl("history") });
    });

    server.registerTool("get_shared_editorial_context", {
      description: "Legge l'ultima copia condivisa dall'utente di Trend Monitor e fonti RSS oppure di Search Console. Usa le date riportate per capire quanto sono recenti i dati.",
      inputSchema: { section: z.enum(["trend", "gsc"]) },
      annotations: readOnly,
    }, async ({ section }) => {
      const snapshot = await reader.context(section);
      return result({ url: viewUrl(section), snapshot, ...(!snapshot && { message: "Dati non ancora condivisi dall'utente." }) });
    });
  }
  return server;
}
