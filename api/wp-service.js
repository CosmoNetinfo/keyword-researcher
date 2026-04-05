/* global Buffer */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, wpUrl, username, appPassword, title, content, internalLinks = [] } = req.body;
  
  if (!wpUrl || !username || !appPassword) {
    return res.status(400).json({ error: 'Credenziali mancanti' });
  }

  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
  const headers = { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" };
  const baseApiUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2`;

  try {
    // ─── 1. FETCH POSTS & CATEGORIES (Ex wp-fetch.js) ──────────────────────
    if (action === 'fetch') {
      const postsUrl = `${baseApiUrl}/posts?status[]=publish&status[]=future&per_page=100`;
      const catUrl = `${baseApiUrl}/categories?per_page=100`;

      const [pRes, cRes] = await Promise.all([
        fetch(postsUrl, { headers }),
        fetch(catUrl, { headers })
      ]);

      if (!pRes.ok) throw new Error("Errore durante il recupero dei post");
      
      const pData = await pRes.json();
      const cData = await cRes.json();

      return res.status(200).json({
        success: true,
        posts: pData.map(p => ({ id: p.id, title: p.title.rendered, url: p.link, status: p.status, date: p.date, categoryIds: p.categories })),
        categories: cData.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }))
      });
    }

    // ─── 2. CREATE DRAFT (Ex wp-draft.js) ──────────────────────────────────
    if (action === 'draft') {
      if (!title) return res.status(400).json({ error: 'Titolo mancante' });
      
      let finalContent = content || "Bozza creata da Keyword Researcher";
      if (internalLinks && internalLinks.length > 0) {
        finalContent += "\n\n<!-- Suggerimenti Link Interni -->\n<div class='related-posts'><h3>Leggi anche:</h3><ul>" + 
          internalLinks.map(l => `<li><a href="${l.url}">${l.title}</a></li>`).join("") + "</ul></div>";
      }

      const response = await fetch(`${baseApiUrl}/posts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title, content: finalContent, status: "draft" })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Errore WordPress API");

      return res.status(200).json({ 
        success: true, 
        id: data.id, 
        link: data.link,
        editLink: `${wpUrl.replace(/\/$/, '')}/wp-admin/post.php?post=${data.id}&action=edit`
      });
    }

    res.status(400).json({ error: 'Azione non valida' });

  } catch (error) {
    console.error("WP Service Error:", error);
    res.status(500).json({ error: error.message });
  }
}
