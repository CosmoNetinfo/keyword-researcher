export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const feedUrl = "https://www.cosmonet.info/feed/";
    const response = await fetch(feedUrl);
    
    if (!response.ok) {
      throw new Error(`Errore nel recupero del feed: ${response.status}`);
    }

    const xml = await response.text();

    // Estrazione semplice dei titoli tramite regex (per evitare dipendenze pesanti in una serverless function)
    const titles = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>([\s\S]*?)<\/title>/;
    const linkRegex = /<link>([\s\S]*?)<\/link>/;

    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];
      const titleMatch = titleRegex.exec(itemContent);
      const linkMatch = linkRegex.exec(itemContent);

      if (titleMatch) {
        // Pulizia minimalista delle entità XML comuni e CDATA
        let title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
        // Decode basic HTML entities
        title = title
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&#8211;/g, "–")
          .replace(/&#8217;/g, "'");

        titles.push({
          title,
          url: linkMatch ? linkMatch[1].trim() : ""
        });
      }
    }

    res.status(200).json({ published: titles });

  } catch (error) {
    console.error("Check Published Error:", error);
    res.status(500).json({ error: error.message });
  }
}
