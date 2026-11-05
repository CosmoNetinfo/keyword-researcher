import assert from "node:assert/strict";
import test from "node:test";
import { aggregatePageRows, findCannibalization, findSeoOpportunities } from "../src/utils/seoOpportunities.js";
import { opportunityReasons } from "../src/utils/exportSeo.js";

const url = path => `https://www.cosmonet.info${path}`;
const row = (keys, clicks, impressions, position = 5) => ({
  keys, clicks, impressions, position, ctr: impressions ? clicks / impressions : 0,
});

test("somma gli URL senza frammento e ricalcola CTR e posizione", () => {
  const [page] = aggregatePageRows([
    row([url("/guida/#uno")], 4, 100, 2),
    row([url("/guida/#due")], 1, 300, 10),
    row([url("/guida/")], 5, 100, 4),
  ], 0);

  assert.deepEqual(page, row([url("/guida/")], 10, 500, 7.2));
});

test("esclude archivi e paginazione dalle righe con dimensione pagina", () => {
  const paths = ["/tag/linux/", "/category/ai/", "/page/2/", "/guida/3/", "/?paged=2", "/?page=2", "/guida-2/"];
  const pages = aggregatePageRows(paths.map(path => row(["linux", url(path)], 5, 100)), 1);

  assert.deepEqual(pages.map(page => page.keys), [["linux", url("/guida-2/")]]);
});

test("conserva la query e non confonde due frammenti con due pagine", () => {
  const rows = ["linux", "guida"].flatMap(query => [
    row([query, url("/guida/#uno")], 4, 30),
    row([query, url("/guida/#due")], 4, 30),
    row([query, url("/altra/")], 3, 50),
  ]);
  const [pair] = findCannibalization(aggregatePageRows(rows, 1));

  assert.deepEqual(pair.pages, [url("/altra/"), url("/guida/")]);
  assert.equal(pair.queries.length, 2);
  assert.equal(pair.primary, url("/guida/"));
});

test("distingue calo di domanda, calo di CTR e casi senza evidenza sufficiente", () => {
  const paths = ["/domanda/", "/stabile/", "/aumento/", "/meta/", "/assente/"];
  const previous = paths.map(path => row([url(path)], 20, 200));
  const current = [99, 200, 220, 100].map((impressions, index) => row([url(paths[index])], 5, impressions));
  const opportunities = new Map(findSeoOpportunities(current, previous).map(item => [item.url, item]));

  assert.deepEqual(paths.map(path => opportunities.get(url(path)).declineLabel), [
    "calo di domanda", "calo di CTR", "calo di CTR", "calo con impressioni in diminuzione", "causa da verificare",
  ]);
  assert.ok(opportunityReasons(opportunities.get(url("/domanda/"))).includes("calo di domanda"));
});
