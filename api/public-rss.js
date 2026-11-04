import { Buffer } from "node:buffer";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList } from "node:net";
import { normalizeFeedUrl } from "../src/utils/feedUrl.js";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 3],
]) {
  blocked.addSubnet(address, prefix);
}
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]]) {
  blocked.addSubnet(address, prefix, "ipv6");
}
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");

export async function fetchPublicRss(value, options) {
  for (let redirects = 0; redirects <= 4; redirects++) {
    const normalized = normalizeFeedUrl(value);
    if (!normalized) throw new Error("Invalid feed URL");
    const url = new URL(normalized);
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const { address, family } = await lookup(hostname);
    const type = family === 6 ? "ipv6" : "ipv4";
    if (blocked.check(address, type) || (family === 6 && !globalV6.check(address, type))) {
      throw new Error("Non-public feed address");
    }

    // Pin the validated address so a DNS change cannot affect the connection.
    const transport = url.protocol === "https:" ? https : http;
    const response = await new Promise((resolve, reject) => {
      const request = transport.get(url, {
        ...options,
        agent: false,
        family,
        lookup: (_hostname, _options, callback) => callback(null, address, family),
      }, resolve);
      request.on("error", reject);
    });

    if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
      response.destroy();
      value = new URL(response.headers.location, url).href;
      continue;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      response.destroy();
      return { ok: false };
    }

    const chunks = [];
    let size = 0;
    for await (const chunk of response) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) throw new Error("Feed response too large");
      chunks.push(chunk);
    }
    return { ok: true, text: async () => Buffer.concat(chunks).toString("utf8") };
  }
  throw new Error("Too many feed redirects");
}
