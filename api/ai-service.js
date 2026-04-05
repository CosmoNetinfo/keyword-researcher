/* global process */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, title, category, brief, currentPosition, prevPosition, prompt, width = 1024, height = 1024 } = req.body;
  const groqKey = process.env.GROQ_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  try {
    // ─── 1. GENERAZIONE IMMAGINI (Pollinations) ─────────────────────────────
    if (action === 'image') {
      if (!prompt) return res.status(400).json({ error: 'Prompt mancante' });
      const cleanPrompt = encodeURIComponent(prompt.trim());
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://pollinations.ai/p/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
      return res.status(200).json({ success: true, imageUrl, source: 'pollinations.ai' });
    }

    // Per le altre azioni serve Groq
    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY non configurata' });

    // ─── 2. GENERAZIONE BRIEF (SEO + Serper) ────────────────────────────────
    if (action === 'brief') {
      if (!title) return res.status(400).json({ error: 'Titolo mancante' });
      let competitorContext = "";
      if (serperKey) {
        try {
          const serperRes = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
            body: JSON.stringify({ q: title, gl: "it", hl: "it", num: 5 })
          });
          const serperJson = await serperRes.json();
          const results = serperJson.organic || [];
          if (results.length > 0) {
            competitorContext = "\n\nCOMPETITOR ATTUALI (Analisi SERP):\n" + results.map(r => `- ${r.title}: ${r.snippet}`).join("\n");
          }
        } catch (e) { console.warn("Serper failed:", e.message); }
      }

      const promptBrief = `Sei un editor SEO di cosmonet.info. Scrivi un brief dettagliato per: ${title}. ${category ? `Cat: ${category}` : ''} ${competitorContext}
      OBIETTIVO: Superare i competitor. Testo 150-250 parole in italiano (struttura, dati verificabili, casi d'uso). VINCOLO: Non inventare dati.`;
      
      const groqRes = await callGroq(groqKey, promptBrief, 0.3);
      return res.status(200).json({ brief: groqRes });
    }

    // ─── 3. GENERAZIONE SOCIAL KIT ──────────────────────────────────────────
    if (action === 'social') {
      if (!title && !brief) return res.status(400).json({ error: 'Dati mancanti' });
      const promptSocial = `Genera un Kit Social (LinkedIn, X, Telegram) per: "${brief || title}" in formato JSON: {"linkedin":"", "twitter":"", "telegram":""}`;
      const groqRes = await callGroq(groqKey, promptSocial, 0.7, true);
      return res.status(200).json(JSON.parse(groqRes));
    }

    // ─── 4. GENERAZIONE RECOVERY PLAN ───────────────────────────────────────
    if (action === 'recovery') {
      if (!title) return res.status(400).json({ error: 'Titolo mancante' });
      const promptRec = `Genera un piano di recupero SEO per "${title}" (calato da ${prevPosition} a ${currentPosition}). 150 parole: Gap, Update, Intent, Links.`;
      const groqRes = await callGroq(groqKey, promptRec, 0.5);
      return res.status(200).json({ brief: groqRes });
    }

    res.status(400).json({ error: 'Azione non valida' });

  } catch (error) {
    console.error("AI Service Error:", error);
    res.status(500).json({ error: error.message });
  }
}

async function callGroq(key, prompt, temp, isJson = false) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: temp,
      ...(isJson ? { response_format: { type: "json_object" } } : {})
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}
