export const config = {
  runtime: 'edge', // Vercel Edge functions
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { url, finalTopic } = await req.json();

    if (!url || !finalTopic) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }

    // 1. Serper.dev Google Search integration
    let googleData = "Nessun risultato trovato o ricerca disabilitata.";
    if (process.env.SERPER_API_KEY) {
      try {
        const serperRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": process.env.SERPER_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            q: `site:${url} ${finalTopic}`,
            gl: "it",
            hl: "it",
            num: 10
          })
        });
        const serperJson = await serperRes.json();
        const results = serperJson.organic || [];
        if (results.length > 0) {
           googleData = JSON.stringify(results.map(r => ({ title: r.title, url: r.link })));
        }
      } catch (e) {
        console.error("Serper API error:", e);
      }
    }

    // 2. Groq LLM logic with llama-3.3-70b-versatile
    const prompt = `Sei un Esperto SEO italiano. Analizza il sito web e la nicchia forniti.
Sito: "${url}"
Nicchia: "${finalTopic}"

Ho già i risultati di ricerca Google per gli articoli esistenti su questo sito. Riepilogo qui:
${googleData}

Obiettivo:
Cerca 5 competitor italiani rilevanti.
Restituisci l'analisi in ESCLUSIVAMENTE formato JSON valido, senza introdurre testo, markdown backticks o descrizioni umane. Il JSON deve rispettare questa esatta struttura:
{"existing_articles":[{"title":"TITOLO","url":"URL","topic":"TOPIC DEDOTTO","status":"ok_o_aggiornare"}],"competitors":[{"name":"NOME","url":"URL","strength":"PUNTO DI FORZA"}],"keywords":[{"keyword":"KEYWORD","difficulty":"bassa_media_alta","intent":"informazionale_transazionale","volume":"~VOLUME/mese"}],"articles":[{"type":"nuovo_oppure_aggiornamento","title":"TITOLO","description":"DESCRIZIONE_E_STRUTTURA","existing_url":null_O_URL_SU_CUI_AGGIORNARE,"update_reason":"MOTIVAZIONE","keywords":["KEYWORD_PRINCIPALE"],"priority":"bassa_media_alta"}],"insights":"FRASE_DI_COACHING_SEO"}

Richieste di volumi:
- 15 Keyword in focus.
- 8 Nuovi Articoli da produrre.
- 4 Articoli da aggiornare.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    const data = await groqRes.json();
    
    if (data.error) throw new Error(data.error.message);

    let content = data.choices[0].message.content;

    // Sanitize in case model hallucinates backticks despite json_object response_format
    if (content.startsWith("```")) {
        content = content.trim().replace(/^```json|^```|```$/g, "").trim();
    }

    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
