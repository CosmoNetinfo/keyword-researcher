# 🔍 Keyword Researcher (Vercel Serverless)

> Strumento SEO professionale per analizzare il tuo sito, studiare i competitor italiani e pianificare i contenuti — ora multi-provider (Claude, Gemini, Groq) con web search integrata via Serper.dev.

---

## ✨ Funzionalità

### 🤖 Multi-LLM Support
Scegli il motore AI più adatto alle tue esigenze dall'interfaccia:
- **Groq (LLaMA 3.3)** — Performance istantanee e completamente gratuito.
- **Google Gemini 2.5 Flash** — Ottimo equilibrio e precisione, perfetto per la v1beta.
- **Anthropic Claude 3.5 Sonnet** — Il gold standard per la qualità del contenuto SEO.

### 📡 Web Search & Analisi
- **Serper.dev Integration** — Cerca in tempo reale i tuoi contenuti esistenti e i competitor su Google Italia.
- **Scansione sito** — Trova automaticamente gli articoli già pubblicati sul tuo dominio.
- **Keyword research** — 15+ keyword con difficoltà, intento e volume.
- **Content Gap Analysis** — IDEE per nuovi articoli e suggerimenti di aggiornamento.

---

## 🚀 Architettura

L'applicazione utilizza una **Vercel Serverless Function** (`Edge Runtime`) per gestire le chiamate API in modo sicuro. Questo approccio:
1. **Nasconde le API Keys** — Mai esposte nel browser.
2. **Evita problemi CORS** — Comunicazione fluida backend-to-backend.
3. **Ottimizza le performance** — Elaborazione vicina all'utente.

---

## ⚙️ Setup Chiavi API

Per il funzionamento completo, avrai bisogno di queste chiavi (tutte offrono piani gratuiti generosi):

1. **[Serper.dev](https://serper.dev)** (Search) → 2500 ricerche gratis al mese.
2. **[Groq Cloud](https://console.groq.com)** (LLM) → LLaMA 3.3 ultraveloce.
3. **[Google AI Studio](https://aistudio.google.com)** (Gemini) → Accesso a Gemini 2.5/1.5.
4. **[Anthropic Console](https://console.anthropic.com)** (Claude) → Opzionale, per massima qualità.

---

## 🌐 Deploy su Vercel

1. Importa il repo su [vercel.com](https://vercel.com)
2. Aggiungi le seguenti **Environment Variables**:
   - `SERPER_API_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY`
3. Clicca **Deploy**

---

## 📦 Sviluppo Locale

1. Clona e installa:
   ```bash
   npm install
   ```
2. Crea un file `.env` con le chiavi sopra indicate.
3. Avvia:
   ```bash
   npm run dev
   ```

---

## 💾 Privacy & Dati

- **localStorage** — Lo storico e gli stati dei task sono salvati esclusivamente sul tuo browser.
- **Zero Database** — L'app non conserva dati su server esterni se non durante l'invocazione delle API AI.

---

## 👤 Autore

Daniele — [cosmonet.info](https://www.cosmonet.info)
