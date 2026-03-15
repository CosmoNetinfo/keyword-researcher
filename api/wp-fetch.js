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

    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const headers = {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json"
    };

    let allPosts = [];
    let warning = null;

    // Funzione helper per scaricare tutte le pagine di un endpoint
    async function fetchAllPages(baseApiUrl) {
      let page = 1;
      let totalPages = 1;
      let results = [];

      while (page <= totalPages) {
        const paginatedUrl = `${baseApiUrl}&page=${page}`;
        const response = await fetch(paginatedUrl, { method: "GET", headers });
        const contentType = response.headers.get("content-type");
        let data = {};
        if (contentType && contentType.includes("application/json")) {
           data = await response.json();
        } else {
           const text = await response.text();
           throw { status: response.status, message: `Risposta non JSON dal server WordPress: ${text.substring(0, 100)}` };
        }

        if (!response.ok) {
          throw { status: response.status, message: data.message || "Errore sconosciuto" };
        }

        results = results.concat(data);
        
        // Leggiamo il numero totale di pagine dall'header (solo alla prima iterazione)
        if (page === 1) {
          totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1", 10);
        }
        page++;
      }
      return results;
    }

    try {
      // 1. Tenta il fetch con entrambi gli stati
      const apiUrlAll = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?status[]=publish&status[]=future&per_page=100`;
      allPosts = await fetchAllPages(apiUrlAll);
    } catch (err) {
      // 2. Se fallisce con 400 (spesso per lo stato 'future' non permesso), tenta solo i pubblicati
      if (err.status === 400) {
        try {
          console.warn("Fetch con 'future' fallito, riprovo solo con 'publish'...");
          const apiUrlPub = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?status=publish&per_page=100`;
          allPosts = await fetchAllPages(apiUrlPub);
          warning = "Non è stato possibile recuperare i post programmati (permessi insufficienti o limitazioni del server).";
        } catch (err2) {
          throw new Error(err2.message || "Errore WordPress API");
        }
      } else if (err.status === 401) {
        throw new Error("Autenticazione fallita: controlla Nome Utente e Application Password (non quella di login!).");
      } else if (err.status === 404) {
        throw new Error("URL base non valido o REST API non trovata.");
      } else {
        throw new Error(err.message || "Errore WordPress API");
      }
    }

    // Mappiamo i dati per restituire solo quello che ci serve
    const posts = allPosts.map(post => ({
      id: post.id,
      title: post.title.rendered,
      url: post.link,
      status: post.status, // publish o future
      date: post.date
    }));

    res.status(200).json({ 
      success: true, 
      posts,
      totalCount: posts.length,
      warning
    });

  } catch (error) {
    console.error("WP Fetch Error:", error);
    res.status(500).json({ error: error.message });
  }
}
