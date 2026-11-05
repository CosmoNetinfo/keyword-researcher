import { google } from "googleapis";
import { appOriginAllowed } from "../server/app-access.js";
import { readSearchRows, wordpressPageMetadata } from "../server/gsc-report.js";
import {
  classifyPage, comparisonPeriods, findCannibalization, findSeoOpportunities, growthRows, STRUCTURAL_DEFAULTS,
} from "../src/utils/seoOpportunities.js";

export default async function handler(req, res) {
  if (!appOriginAllowed(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo non consentito." });
  const token = req.body?.access_token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Sessione Search Console scaduta: accedi di nuovo", code: "GSC_SESSION_EXPIRED" });

  const { action = "data", type = "keywords", thresholds, structuralTerms } = req.body || {};
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  const searchconsole = google.searchconsole({ version: "v1", auth });
  const periods = comparisonPeriods();
  const read = (period, dimensions) => readSearchRows(searchconsole, period, dimensions);

  try {
    if (action === "opportunities") {
      const [current, previous, queries] = await Promise.all([
        read(periods.current, ["page"]), read(periods.previous, ["page"]),
        read(periods.current, ["query", "page"]),
      ]);
      const extra = Array.isArray(structuralTerms) ? structuralTerms.filter(term => typeof term === "string")
        .slice(0, 100).map(term => term.trim().slice(0, 100)).filter(Boolean) : [];
      const candidates = findSeoOpportunities(current, previous, queries, thresholds, [...STRUCTURAL_DEFAULTS, ...extra]);
      const metadata = await wordpressPageMetadata(candidates.map(row => row.url));
      const rows = candidates.map(row => {
        const post = metadata.get(new URL(row.url).pathname.replace(/\/$/, ""));
        return { ...row, classification: classifyPage(post, null, periods.current.endDate), publishedAt: post?.date || null };
      });
      return res.status(200).json({
        ...periods, rows, cannibalization: findCannibalization(queries),
        counts: { current: current.length, previous: previous.length, queryPages: queries.length },
      });
    }

    if (action === "growth") {
      const [current, previous] = await Promise.all([read(periods.current, ["query", "page"]), read(periods.previous, ["query", "page"])]);
      return res.status(200).json({ ...periods, success: true, topGrowth: growthRows(current, previous),
        counts: { current: current.length, previous: previous.length } });
    }

    if (action === "data" || action === "pages") {
      const dimensions = action === "pages" ? ["page"]
        : type === "trend" ? ["date"] : type === "cannibalization" ? ["query", "page"] : ["query"];
      const rows = await read(periods.current, dimensions);
      return res.status(200).json({
        ...periods, rowsRead: rows.length,
        rows: type === "cannibalization" ? [] : rows.slice(0, 150),
        ...(type === "cannibalization" && { pairs: findCannibalization(rows) }),
      });
    }

    return res.status(400).json({ error: "Azione non valida." });
  } catch (error) {
    if (Number(error.response?.status || error.status || error.code) === 401 || /invalid credentials/i.test(error.message)) {
      return res.status(401).json({ error: "Sessione Search Console scaduta: accedi di nuovo", code: "GSC_SESSION_EXPIRED" });
    }
    console.error("Errore Search Console:", error.code || error.name);
    return res.status(502).json({ error: "Search Console non ha restituito il report. Riprova tra poco." });
  }
}
