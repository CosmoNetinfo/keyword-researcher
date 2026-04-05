/* global process */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, brief } = req.body;
    if (!title && !brief) return res.status(400).json({ error: 'Dati mancanti' });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY non configurata' });

    const prompt = `Sei un esperto di Social Media Marketing per cosmonet.info (blog tech italiano).
Partendo da questo ${brief ? 'brief' : 'titolo'}:
"${brief || title}"

Genera un Kit Social in italiano composto da 3 post:
1. **LinkedIn**: Professionale, focalizzato sul valore per l'azienda o per lo sviluppatore. (max 1500 char)
2. **X (Twitter)**: Breve, incisivo, con una "hook" che cattura l'attenzione. (max 280 char)
3. **Telegram / WhatsApp**: Informale, diretto, perfetto per una community.

Usa emoji appropriate e hashtag pertinenti (#Tech #Linux #AI #CosmoNet).
Restituisci il risultato in formato JSON strutturato così:
{
  "linkedin": "...",
  "twitter": "...",
  "telegram": "..."
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Errore Groq API');

    const content = JSON.parse(data.choices[0].message.content);
    
    res.status(200).json(content);

  } catch (error) {
    console.error("Social Gen Error:", error);
    res.status(500).json({ error: error.message });
  }
}
