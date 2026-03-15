export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, finalTopic, provider } = req.body;

    if (!url || !finalTopic || !provider) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // 1. Serper.dev Google Search integration
    let googleData = "Nessun risultato trovato o ricerca disabilitata.";
    const env = process.env;
    const serperKey = env.SERPER_API_KEY;
    
    if (serperKey) {
      try {
        const serperRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
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

    // 2. Prompt logic
    const prompt = `Sei un Esperto SEO italiano. Analizza il sito web e la nicchia forniti.
Sito: "${url}"
Nicchia: "${finalTopic}"

Ho già i risultati di ricerca Google per gli articoli esistenti su questo sito. Riepilogo qui:
${googleData}

Obiettivo:
Cerca 20 competitor rilevanti (di cui almeno 10 italiani). 
Prendi spunto da questi competitor se pertinenti:
- IT: aranzulla.it, intelligenzaartificialeitalia.net, html.it, punto-informatico.it, hdblog.it, wired.it, tomshw.it, pcpercaso.it, miamammausalinux.org, linux-magazine.it, trovalost.it, openlinux.it, digitalic.it.
- International: itsfoss.com, linuxhint.com, makeuseof.com, howtogeek.com, techradar.com, venturebeat.com, 9to5linux.com, omgubuntu.co.uk, linuxinsider.com, phoronix.com, unixmen.com, tech2geek.net, desdelinux.net.
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
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
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
      const geminiApiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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
          "x-api-key": env.ANTHROPIC_API_KEY,
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

    if (content.startsWith("```")) {
        content = content.trim().replace(/^```json|^```|```$/g, "").trim();
    }

    const resultObj = JSON.parse(content);

    // FEATURE 1: Arricchimento Keyword via Serper (Dati reali)
    if (serperKey && resultObj.keywords && resultObj.keywords.length > 0) {
      try {
        const enriched = await Promise.all(
          resultObj.keywords.slice(0, 10).map(async (kw) => {
            try {
              const r = await fetch("https://google.serper.dev/search", {
                method: "POST",
                headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
                body: JSON.stringify({ q: kw.keyword, gl: "it", hl: "it", num: 5 })
              });
              const data = await r.json();
              const adsCount = data.ads?.length || 0;
              const organicCount = data.organic?.length || 0;
              
              return {
                ...kw,
                serper_ads: adsCount,
                serper_organic: organicCount,
                difficulty_real: adsCount > 2 ? 'alta' : kw.difficulty
              };
            } catch (err) {
              console.error("Single keyword enrichment error:", err);
              return kw;
            }
          })
        );
        // Replace first 10 with enriched ones, keep the rest
        resultObj.keywords = [...enriched, ...resultObj.keywords.slice(10)];
      } catch (e) {
        console.error("Enrichment process error:", e);
      }
    }

    res.status(200).json(resultObj);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
