/* global process */
import { GROQ_MODEL, readModelResponse } from "../server/ai-models.js";
import { requireAppUser } from "../server/app-access.js";

export default async function handler(req, res) {
  if (!(await requireAppUser(req, res))) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, title, category, brief, prompt, width = 1024, height = 1024 } = req.body;
  const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  try {
    // ─── 1. GENERAZIONE IMMAGINI (Pollinations) ─────────────────────────────
    if (action === 'image') {
      if (!prompt) return res.status(400).json({ error: 'Prompt mancante' });
      const cleanPrompt = encodeURIComponent(prompt.trim());
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://gen.pollinations.ai/image/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
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

    // ─── 5. ANALISI STRATEGICA COMPETITOR (NEW) ─────────────────────────────
    if (action === 'analyze-competitor') {
      const { posts, domain } = req.body;
      if (!posts || !posts.length) return res.status(400).json({ error: 'Post mancanti' });
      const promptComp = `Sei un esperto SEO analista di cosmonet.info. Analizza questi ultimi 5 articoli di "${domain}":
      ${posts.map(p => `- ${p.title}`).join('\n')}
      
      OBIETTIVO: Fornisci un report strategico in italiano (150 parole max) che indichi:
      1. FOCUS ATTUALE: Su cosa sta puntando il competitor?
      2. GAP SEO: Quale "angolo" o dettaglio è stato tralasciato che noi possiamo coprire?
      3. KILLER TITLE: Suggerisci 1 titolo per il nostro Piano Editoriale che superi questi contenuti.`;
      
      const groqRes = await callGroq(groqKey, promptComp, 0.4);
      return res.status(200).json({ report: groqRes });
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
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: temp,
      ...(isJson ? { response_format: { type: "json_object" } } : {})
    })
  });
  const data = await readModelResponse(res, GROQ_MODEL, "GROQ_MODEL");
  return data.choices[0].message.content;
}
