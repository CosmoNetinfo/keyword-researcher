# 🚀 CosmoNet Keyword Researcher & Editorial Suite

**CosmoNet Keyword Researcher Pro** è una suite di intelligenza artificiale avanzata per SEO e Content Strategy, progettata per massimizzare il traffico organico del blog `cosmonet.info`.
Il tool automatizza l'intero workflow editoriale: dalla scoperta di keyword tramite Google Search Console e Trend (RSS), alla generazione di brief ottimizzati tramite LLM (Llama 3.3, Gemini 2.0, Claude 3.5), fino alla sincronizzazione con WordPress.

---

## 🌟 Funzionalità Principali

### 📊 Integrazione Google Search Console (GSC)
- **Analisi del Traffico**: Visualizza click, impressioni, CTR e posizione media.
- **Identificazione "Quick Win"**: Badge automatico per le keyword posizionate tra il 5° e il 20° posto.
- **Azione Rapida**: Lancia un'analisi AI ottimizzata direttamente da una keyword GSC per scalare le posizioni in Top 3.

### 🤖 Analisi AI Multimodello
- **Motori Supportati**: Groq (Llama-3.3-70b-versatile), Gemini 2.0 Flash, Claude 3.5 Sonnet.
- **Modalità Quick Win**: Ottimizza i prompt per aggiornare e migliorare contenuti esistenti piuttosto che crearne di nuovi da zero.
- **Zero Allucinazioni**: Vincoli di prompt stringenti per garantire che l'elaborazione si basi su trend reali del 2026 e dati verificabili.

### 📡 Trend Monitor RSS
- **Aggiornamenti in Tempo Reale**: Monitoraggio di oltre 60 fonti feed RSS dal mondo Tech, AI e Linux.
- **Add to Plan**: Aggiungi istantaneamente una notizia di tendenza al tuo Piano Editoriale con un solo click.

### 📅 Gestione Piano Editoriale
- **Kanban / Tabella**: Organizza gli articoli da scrivere, in lavorazione e completati.
- **Sincronizzazione WordPress**: Importa lo stato degli articoli (pubblicati, programmati, bozze) direttamente dal CMS.
- **Brief Generator**: Ottieni un brief SEO dettagliato generato dall'AI pronto da copiare.

---

## 🛠 Stack Tecnologico

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Database**: Firebase Firestore (Real-time data sync)
- **Backend / API**: Node.js Serverless Functions (deploy su Vercel)
- **Integrazioni Esterne**: API Google Search Console, API WordPress REST, Serper.dev (Google Search API), API LLM (Groq, Anthropic, Google).

---

## 🚀 Setup e Sviluppo Locale

### Prerequisiti
- Node.js (v18+)
- Vercel CLI (per testare le API serverless in locale)

### Installazione

1. Clona la repository.
2. Installa le dipendenze:
   ```bash
   npm install
   ```

3. Crea un file `.env.local` nella root del progetto basandoti su `.env.example` (assicurati di non committarlo!):
   ```env
   VITE_FIREBASE_API_KEY="la-tua-chiave-firebase"
   GROQ_API_KEY="la-tua-chiave-groq"
   GEMINI_API_KEY="la-tua-chiave-gemini"
   ANTHROPIC_API_KEY="la-tua-chiave-anthropic"
   SERPER_API_KEY="la-tua-chiave-serper"
   VITE_GSC_CLIENT_ID="id-client-google-cloud"
   WP_APPLICATION_PASSWORD="password-app-wordpress"
   ```

### Avvio

Per avviare solo il frontend:
```bash
npm run dev
```

Per testare correttamente l'applicazione completa (Frontend + Serverless Functions via proxy Vercel), usa:
```bash
vercel dev
```

---

*Prodotto con ❤️ dal team di sviluppo CosmoNet Pro per il web di domani.*
