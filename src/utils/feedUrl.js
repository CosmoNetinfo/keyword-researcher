export const RSS_BATCH_SIZE = 20;

export function normalizeFeedUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}
