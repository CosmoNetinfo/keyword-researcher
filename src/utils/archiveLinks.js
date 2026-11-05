const WIKILINK = /\[\[([^\]\n|]+)(?:\|([^\]\n]+))?\]\]/g;
const normalize = text => text.trim().toLocaleLowerCase("it");

export function noteLinks(markdown, notes, saved = []) {
  const ids = new Set(notes.map(note => note.id));
  const titles = new Map();
  for (const note of notes) {
    const title = normalize(note.title);
    titles.set(title, titles.has(title) ? null : note.id);
  }
  const previous = new Map(saved.map(link => [link.label, link.id]));
  const resolved = new Map();
  for (const [, target, alias] of markdown.matchAll(WIKILINK)) {
    const label = target.trim();
    const id = alias ? (ids.has(label) ? label : null) : previous.get(label) || titles.get(normalize(label));
    if (id) resolved.set(label, { id, label });
  }
  return [...resolved.values()];
}
