export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, width = 1024, height = 1024 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt mancante' });

    // Pulizia prompt per URL
    const cleanPrompt = encodeURIComponent(prompt.trim());
    const seed = Math.floor(Math.random() * 1000000); // Per varietà
    
    // Pollinations.ai URL
    // Sintassi: https://pollinations.ai/p/{prompt}?width={width}&height={height}&seed={seed}&model=flux
    const imageUrl = `https://pollinations.ai/p/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;

    // Possiamo restituire direttamente l'URL o l'immagine in base64.
    // Restituiamo l'URL per semplicità, il frontend lo caricherà.
    
    res.status(200).json({ 
      success: true, 
      imageUrl,
      source: 'pollinations.ai'
    });

  } catch (error) {
    console.error("Image Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
}
