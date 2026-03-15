export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wpUrl, username, appPassword } = req.body;

    if (!wpUrl || !username || !appPassword) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // Costruzione URL API WP per recuperare post pubblicati e futuri
    // Nota: per vedere i post 'future' serve l'autenticazione
    const apiUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?status=publish,future&per_page=100`;
    
    // Auth Basic con Application Password
    /* eslint-disable no-undef */
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Autenticazione fallita: controlla Nome Utente e Application Password.");
      }
      if (response.status === 404) {
        throw new Error("URL base non valido o REST API non trovata su questo sito.");
      }
      throw new Error(data.message || `Errore WordPress API (${response.status})`);
    }

    // Mappiamo i dati per restituire solo quello che ci serve
    const posts = data.map(post => ({
      id: post.id,
      title: post.title.rendered,
      url: post.link,
      status: post.status, // publish o future
      date: post.date
    }));

    res.status(200).json({ 
      success: true, 
      posts
    });

  } catch (error) {
    console.error("WP Fetch Error:", error);
    res.status(500).json({ error: error.message });
  }
}
