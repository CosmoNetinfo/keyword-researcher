export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wpUrl, username, appPassword, title, content, internalLinks = [] } = req.body;
    
    if (!wpUrl || !username || !appPassword || !title) {
        return res.status(400).json({ error: 'Parametri mancanti' });
    }

    const apiUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
    /* eslint-disable no-undef */
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    let finalContent = content || "Bozza creata da Keyword Researcher";
    
    // Iniezione link interni a fine articolo (Opzione A)
    if (internalLinks && internalLinks.length > 0) {
      finalContent += "\n\n<!-- Suggerimenti Link Interni -->\n" + 
        "<div class='related-posts'><h3>Leggi anche:</h3><ul>" + 
        internalLinks.map(l => `<li><a href="${l.url}">${l.title}</a></li>`).join("") + 
        "</ul></div>";
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      },
      body: JSON.stringify({
        title,
        content: finalContent,
        status: "draft"
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Errore WordPress API");
    }

    res.status(200).json({ 
      success: true, 
      id: data.id, 
      link: data.link,
      editLink: `${wpUrl.replace(/\/$/, '')}/wp-admin/post.php?post=${data.id}&action=edit`
    });

  } catch (error) {
    console.error("WP Draft Error:", error);
    res.status(500).json({ error: error.message });
  }
}
