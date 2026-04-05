/* global process */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, currentPosition, prevPosition } = req.body;
    if (!title) return res.status(400).json({ error: 'Titolo mancante' });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY non configurata' });

    const prompt = `Sei un esperto di SEO Recovery per cosmonet.info.
L'articolo "${title}" ha perso posizioni in classifica (da ${prevPosition || 'N.A.'} a ${currentPosition}).

Genera un breve PIANO DI RECUPERO (150-200 parole) in italiano che includa:
1. **Analisi Gap**: Perché potremmo aver perso posizioni (ipotesi tecniche: freschezza, intent mutato).
2. **Aggiornamento Contenuti**: Quali sezioni aggiungere o riscrivere (es. FAQ aggiornate, dati 2026).
3. **Nuovi Intent**: Suggerisci se integrare video o nuovi casi d'uso.
4. **Link Strategy**: Suggerimento di 2-3 anchor text da rinforzare.

Scrivi SOLO il piano di recupero. Inizia con "Piano di recupero per...".`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    res.status(200).json({ brief: data.choices[0].message.content });

  } catch (error) {
    console.error("Recovery Brief Error:", error);
    res.status(500).json({ error: error.message });
  }
}
