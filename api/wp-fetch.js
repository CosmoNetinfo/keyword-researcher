/* global Buffer */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wpUrl, username, appPassword } = req.body;

    if (!wpUrl || !username || !appPassword) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    // 1. Tenta il fetch con entrambi gli stati
    const apiUrlAll = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?status[]=publish&status[]=future&per_page=100`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const headers = {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json"
    };

    let response = await fetch(apiUrlAll, { method: "GET", headers });
    let data = await response.json();
    let partialFetch = false;

    // 2. Se fallisce con 400 (spesso per lo stato 'future' non permesso), tenta solo i pubblicati
    if (!response.ok && response.status === 400) {
      console.warn("Fetch con 'future' fallito, riprovo solo con 'publish'...");
      const apiUrlPub = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?status=publish&per_page=100`;
      response = await fetch(apiUrlPub, { method: "GET", headers });
      data = await response.json();
      partialFetch = true;
    }
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Autenticazione fallita: controlla Nome Utente e Application Password (non quella di login!).");
      }
      if (response.status === 404) {
        throw new Error("URL base non valido o REST API non trovata.");
      }
      throw new Error(data.message || `Errore WordPress API (${response.status})`);
    }

    if (partialFetch) {
      // Potremmo voler gestire questa informazione nel frontend
      // Aggiungiamo un segnaposto per far capire che mancano i programmati
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
      posts,
      warning: partialFetch ? "Non è stato possibile recuperare i post programmati (permessi insufficienti o limitazioni del server)." : null
    });

  } catch (error) {
    console.error("WP Fetch Error:", error);
    res.status(500).json({ error: error.message });
  }
}
