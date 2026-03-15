export default async function handler(req, res) {
  // Support GET for simple feed check, POST for SEO check
  const method = req.method;
  
  try {
    if (method === 'GET') {
      const { type } = req.query;
      let url = "https://www.cosmonet.info/feed/";
      
      if (type === 'sitemap') {
        url = "https://www.cosmonet.info/post-sitemap.xml";
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Errore recupero: ${response.status}`);
      const xml = await response.text();
      const published = [];

      if (type === 'sitemap') {
        // Estrazione titoli e url da sitemap (molto semplificata)
        const locRegex = /<loc>([\s\S]*?)<\/loc>/g;
        let match;
        while ((match = locRegex.exec(xml)) !== null) {
          const loc = match[1].trim();
          if (loc.includes('/feed/')) continue;
          // In una sitemap non abbiamo i titoli, quindi estraiamo uno slug "pulito" come titolo temporaneo
          const slug = loc.split('/').filter(Boolean).pop() || "";
          const title = slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
          published.push({ title, url: loc });
        }
      } else {
        // Logica RSS esistente
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title>([\s\S]*?)<\/title>/;
        const linkRegex = /<link>([\s\S]*?)<\/link>/;
        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
          const itemContent = match[1];
          const titleMatch = titleRegex.exec(itemContent);
          const linkMatch = linkRegex.exec(itemContent);
          if (titleMatch) {
            let title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
            published.push({ title, url: linkMatch ? linkMatch[1].trim() : "" });
          }
        }
      }
      return res.status(200).json({ published });
    }

    if (method === 'POST') {
      const { url, keyword } = req.body;
      if (!url) return res.status(400).json({ error: "URL mancante" });

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Errore caricamento pagina: ${response.status}`);
      const html = await response.text();
      
      const lowerHtml = html.toLowerCase();
      const kw = (keyword || "").toLowerCase();
      
      // Analisi SEO base
      const results = {
        title: lowerHtml.includes("<title>") && lowerHtml.split("<title>")[1].split("</title>")[0].includes(kw),
        h1: lowerHtml.includes("<h1") && lowerHtml.split("<h1")[1].split("</h1>")[0].includes(kw),
        keywordCount: kw ? lowerHtml.split(kw).length - 1 : 0,
        hasImages: lowerHtml.includes("<img"),
        hasAlt: lowerHtml.includes('alt="') || lowerHtml.includes("alt='")
      };

      let score = 0;
      if (results.title) score += 40;
      if (results.h1) score += 30;
      if (results.keywordCount > 0) score += 20;
      if (results.hasAlt) score += 10;

      return res.status(200).json({ score, results });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
