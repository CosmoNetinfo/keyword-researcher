export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wpUrl, username, appPassword, title, content } = req.body;

    if (!wpUrl || !username || !appPassword || !title) {
      return res.status(400).json({ error: 'Parametri mancanti' });
    }

    // Costruzione URL API WP
    const apiUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
    
    // Auth Basic con Application Password
    /* eslint-disable no-undef */
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      },
      body: JSON.stringify({
        title,
        content: content || "Bozza creata da Keyword Researcher",
        status: "draft",
        // categories: [1] // Potrebbe servire il mapping delle categorie
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
