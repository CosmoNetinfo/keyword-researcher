# 🚀 Keyword Researcher & Piano Editoriale AI

**Keyword Researcher Pro** è una potente suite "All-in-One" progettata per SEO, Content Manager e Copywriter. Automatizza l'intero processo editoriale: dalla scoperta di keyword alla generazione di idee, fino alla gestione di un piano editoriale sincronizzato in tempo reale con WordPress.

---

## 💎 Caratteristiche Principali

### 🔍 1. Nuova Analisi (AI Research)

Trasforma un semplice URL e un argomento in una strategia completa:

- **Analisi Competitor**: Scansione automatica per identificare i principali player della nicchia.
- **Content Gap Analysis**: Identifica cosa manca al tuo sito rispetto ai competitor.
- **Keyword Blueprint**: Genera liste di parole chiave con volumi, difficoltà AI e intento di ricerca.
- **Ideazione Contenuti**: Suggerisce nuovi articoli e aggiornamenti per massimizzare il ROI del traffico.

### 📅 2. Piano Editoriale Premium

Un centro di controllo per il tuo calendario di pubblicazione:

- **Sincronizzazione WordPress**: Importazione bidirezionale di articoli pubblicati e programmati tramite API REST.
- **Filtri Intelligenti**: Organizzazione dei contenuti per anno, mese e categorie (con filtro rapido per le categorie principali).
- **Vista Calendario & Tabella**: Passa da una visualizzazione tabellare dettagliata a una panoramica mensile.
- **Check SEO On-Page**: Verifica istantaneamente la salute SEO dei tuoi articoli online.

### 📡 3. Trend Monitor (Real-time RSS)

Resta sempre un passo avanti ai competitor:

- **Multi-Source Feed**: Monitoraggio di oltre 60 sorgenti (Linux, AI, Gaming, Tech) in tempo reale.
- **AI Enrichment**: Le ultime notizie dei competitor vengono iniettate nel prompt dell'analisi per suggerimenti sempre attuali.
- **Filtri Rapidi**: Navigazione fluida tra nicchie italiane e internazionali.

### 📊 4. GSC Insights (Google Search Console)

Dati reali e gratuiti per una strategia basata sui fatti:

- **Integrazione Diretta**: Connessione sicura tramite OAuth2 alle API di Google Search Console.
- **KPI Performance**: Visualizzazione istantanea di Click, Impressioni, CTR e Posizione Media.
- **Analisi Query & Pagine**: Scopri quali keyword portano traffico e quali pagine performano meglio per cosmonet.info.

### 🤖 5. Multi-Engine AI Support

Utilizza il meglio della tecnologia LLM:

- **Groq (LLaMA 3.3)**: Velocità estrema per analisi istantanee.
- **Google Gemini 2.0**: Accuratezza e profondità di ragionamento.
- **Anthropic Claude 3.5**: Eccellente per la generazione di testi e descrizioni creative.

---

## 🛠 Stack Tecnologico

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS Premium con utility [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (Real-time)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend API**: Node.js Serverless (Vercel) + **Google APIs**

---

## 📁 Struttura del Progetto

```text
keyword-researcher/
├── api/                # Cloud Functions (Backend Serverless)
│   ├── analyze.js      # Orchestrazione della ricerca tramite AI + RSS Context
│   ├── gsc-data.js     # Recupero dati keyword da Search Console
│   ├── gsc-pages.js    # Recupero dati pagine da Search Console
│   ├── rss-trends.js   # Endpoint per il recupero dei trend dai competitor
│   ├── rss-feeds.js    # Catalogo e parser per i feed RSS/Atom
│   ├── wp-fetch.js     # Ponte sicuro con l'API WordPress 
│   └── ...
├── src/                # Sorgenti Applicazione
│   ├── components/     # UI Components (Piano Editoriale, Sidebar, GSCInsights...)
│   ├── App.jsx         # Logica principale e visualizzazione Analisi
│   ├── App.css         # Styling Premium e Design System
│   └── firebase.js     # Connessione al database real-time
├── public/             # Asset statici (loghi, manifest PWA)
└── .env                # Configurazioni sensibili (API Keys)
```

---

## 🚀 Guida Rapida alla Configurazione

### 1. Prerequisiti

Assicurati di avere [Node.js 20.x](https://nodejs.org/) installato.

### 2. Installazione

```bash
npm install
```

### 3. Variabili d'Ambiente

Crea un file `.env` nella root del progetto e inserisci le tue chiavi:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
GROQ_API_KEY=...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
SERPER_API_KEY=... # Necessario per la ricerca Google dei competitor
VITE_GSC_CLIENT_ID=... # Client ID per l'integrazione Google Search Console
```

### 4. Avvio Sviluppo

Per il solo frontend:

```bash
npm run dev
```

Per testare le API (WordPress, SEO Check, AI, GSC) è necessario usare Vercel CLI:

```bash
vercel dev
```

---

## 🌟 Note sulla Versione "Premium UI"

L'ultima versione include un redesign completo:

- **GSC Insights**: Nuovo tab dedicato per l'analisi delle performance organiche reali.
- **Trend Monitor**: Una nuova vista dedicata per lo scouting delle notizie in tempo reale.
- **Ottimizzazione Categorie**: Un sistema di filtraggio bilanciato che mostra le categorie principali come tasti rapidi.
- **Fix di Produzione**: Risolti i ReferenceError e gli errori di build riscontrati in precedenza.

---

*Prodotto con ❤️ dal team di sviluppo CosmoNet Pro.*
