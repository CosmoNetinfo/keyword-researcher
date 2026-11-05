export function comparisonPeriods(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const { year, month, day: date } = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const day = new Date(`${year}-${month}-${date}T00:00:00Z`);
  const offset = days => new Date(day.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  return {
    current: { startDate: offset(30), endDate: offset(3) },
    previous: { startDate: offset(58), endDate: offset(31) },
  };
}

export function findSeoOpportunities(current, previous) {
  const prior = new Map(previous.map(row => [row.keys[0], row]));
  return current.flatMap(row => {
    const url = row.keys[0];
    const old = prior.get(url);
    const lostClicks = old ? old.clicks - row.clicks : 0;
    const declining = old && lostClicks >= 5 && lostClicks / old.clicks >= 0.2;
    const lowCtr = row.impressions >= 100 && row.position <= 10 && row.ctr < 0.03;
    if (!declining && !lowCtr) return [];
    return [{ url, clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position,
      lostClicks: declining ? lostClicks : 0, lowCtr }];
  }).sort((a, b) => b.lostClicks - a.lostClicks || b.impressions - a.impressions).slice(0, 15);
}
