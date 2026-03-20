/* global process */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Titolo mancante' });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY non configurata sul server' });

    const prompt = `Sei un editor SEO esperto di cosmonet.info, blog tech italiano.
Scrivi un brief dettagliato per un articolo su: ${title}
${category ? `Categoria: ${category}` : ''}

Testo narrativo in italiano di 150-250 parole che includa:
- Contesto e rilevanza dell'argomento nel 2026
- Struttura consigliata (sezioni chiave da trattare)
- Dati, statistiche o fatti tecnici specifici da includere
- Casi d'uso concreti per sviluppatori e utenti Linux
- Confronto con alternative/competitor se pertinente
- Conclusione con implicazioni future per il lettore

Scrivi SOLO il testo del brief. Inizia con "Scrivi un articolo...".`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Errore Groq API');

    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Nessun testo restituito dalla AI');

    res.status(200).json({ brief: text });

  } catch (error) {
    console.error('Generate Brief Error:', error);
    res.status(500).json({ error: error.message });
  }
}
