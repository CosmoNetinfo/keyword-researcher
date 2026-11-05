import assert from "node:assert/strict";
import test from "node:test";
import { google } from "googleapis";
import handler from "../api/gsc-service.js";
import { comparisonPeriods, GSC_DATE_RANGES } from "../src/utils/seoOpportunities.js";
import { readSearchRows } from "../server/gsc-report.js";
import { buildSeoMarkdown } from "../src/utils/exportSeo.js";

const duration = period => (Date.parse(period.endDate) - Date.parse(period.startDate)) / 86_400_000 + 1;

test("tutti i periodi hanno un confronto consecutivo della stessa durata", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  for (const option of GSC_DATE_RANGES) {
    const { current, previous } = comparisonPeriods(now, option.id);
    assert.equal(duration(current), option.days);
    assert.equal(duration(previous), option.days);
    assert.equal(Date.parse(current.startDate) - Date.parse(previous.endDate), 86_400_000);
    assert.equal(current.endDate, option.id === "yesterday" ? "2026-11-04" : "2026-11-05");
  }
  assert.throws(() => comparisonPeriods(now, "invalid"), /Periodo Search Console non valido/);
});

test("oggi e ieri seguono Roma anche quando nel Pacifico è ancora il giorno prima", () => {
  const now = new Date("2026-11-04T23:30:00Z");
  assert.deepEqual(comparisonPeriods(now, "today"), {
    current: { startDate: "2026-11-05", endDate: "2026-11-05" },
    previous: { startDate: "2026-11-04", endDate: "2026-11-04" },
  });
  assert.equal(comparisonPeriods(now, "yesterday").current.startDate, "2026-11-04");
  assert.deepEqual(comparisonPeriods(now), {
    current: { startDate: "2026-10-05", endDate: "2026-11-01" },
    previous: { startDate: "2026-09-07", endDate: "2026-10-04" },
  });
});

test("il passaggio all’ora legale e il giorno bisestile mantengono le date inclusive", () => {
  const week = comparisonPeriods(new Date("2026-03-29T22:30:00Z"), "week");
  assert.deepEqual(week.current, { startDate: "2026-03-24", endDate: "2026-03-30" });
  const yesterday = comparisonPeriods(new Date("2024-03-01T12:00:00Z"), "yesterday");
  assert.equal(yesterday.current.startDate, "2024-02-29");
});

test("la lettura dei dati recenti usa dataState all su tutte le pagine", async () => {
  const calls = [];
  const client = { searchanalytics: { query: async ({ requestBody }) => {
    calls.push(requestBody);
    return { data: { rows: requestBody.startRow === 0 ? Array(25_000).fill({}) : [] } };
  } } };
  const period = comparisonPeriods(new Date("2026-11-05T12:00:00Z"), "today").current;
  await readSearchRows(client, period, ["query"], "all");
  assert.deepEqual(calls.map(call => [call.startRow, call.dataState]), [[0, "all"], [25_000, "all"]]);
});

test("API, grafico annuale e report usano il periodo richiesto", async () => {
  const original = google.searchconsole;
  const calls = [];
  google.searchconsole = () => ({ searchanalytics: { query: async ({ requestBody }) => {
    calls.push(requestBody);
    const rows = requestBody.dimensions[0] === "date" ? Array.from({ length: 365 }, (_, index) => ({
      keys: [new Date(Date.parse(requestBody.startDate) + index * 86_400_000).toISOString().slice(0, 10)],
      clicks: 365 - index, impressions: 1000, ctr: 0.01, position: 5,
    })).reverse() : [];
    return { data: { rows } };
  } } });
  const request = async body => {
    const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method: "POST", headers: {}, body: { access_token: "test-fixture", ...body } }, response);
    return response;
  };
  try {
    const invalid = await request({ action: "data", range: "invalid" });
    assert.equal(invalid.code, 400);
    assert.equal(calls.length, 0);
    for (const option of GSC_DATE_RANGES) {
      calls.length = 0;
      const response = await request({ action: "pages", range: option.id });
      assert.equal(response.code, 200);
      assert.equal(duration(response.data.current), option.days);
      assert.equal(response.data.range, option.id);
      assert.equal(calls[0].dataState, "all");
    }
    const annual = await request({ action: "data", type: "trend", range: "year" });
    assert.equal(annual.data.rows.length, 365);
    assert.equal(annual.data.rows[0].keys[0], annual.data.current.startDate);
    assert.equal(annual.data.rows.at(-1).keys[0], annual.data.current.endDate);
    assert.match(annual.data.dataNote, /16 mesi/);
    calls.length = 0;
    const opportunities = await request({ action: "opportunities", range: "yesterday" });
    assert.equal(opportunities.code, 200);
    assert.equal(calls.length, 3);
    assert.deepEqual(calls.map(call => call.startDate), [
      opportunities.data.current.startDate, opportunities.data.previous.startDate, opportunities.data.current.startDate,
    ]);
    const markdown = buildSeoMarkdown(opportunities.data);
    assert.match(markdown, /Europe\/Rome/);
    assert.ok(markdown.includes(opportunities.data.current.startDate));
  } finally {
    google.searchconsole = original;
  }
});
