export const config = {
  runtime: 'edge', // Vercel Edge functions - Last update: 2026-03-13 23:19
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { url, finalTopic, provider } = await req.json();

    if (!url || !finalTopic || !provider) {
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

    let content = "";

    if (provider === "groq") {
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
      if (data.error) throw new Error(data.error.message || data.error.type);
      content = data.choices[0].message.content;

    } else if (provider === "gemini") {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
          })
        }
      );
      const data = await geminiRes.json();
      if (data.error) throw new Error(data.error.message);
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } else if (provider === "claude") {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt + "\n\nProvide only the raw valid JSON output." }]
        })
      });
      const data = await claudeRes.json();
      if (data.error) throw new Error(data.error.message);
      content = data.content?.[0]?.text || "";
    } else {
      throw new Error(`Provider sconosciuto: ${provider}`);
    }

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
