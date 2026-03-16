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

### 🤖 3. Multi-Engine AI Support
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
- **Backend API**: Node.js Serverless (Vercel)

---

## 📁 Struttura del Progetto

```text
keyword-researcher/
├── api/                # Cloud Functions (Backend Serverless)
│   ├── analyze.js      # Orchestrazione della ricerca tramite AI
│   ├── wp-fetch.js     # Ponte sicuro con l'API WordPress 
│   └── ...
├── src/                # Sorgenti Applicazione
│   ├── components/     # UI Components (Piano Editoriale, Sidebar, Layout...)
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
```

### 4. Avvio Sviluppo
Per il solo frontend:
```bash
npm run dev
```
Per testare le API (WordPress, SEO Check, AI) è necessario usare Vercel CLI:
```bash
vercel dev
```

---

## 🌟 Note sulla Versione "Premium UI"
L'ultima versione include un redesign completo:
- **Layout Nuova Analisi**: Una dashboard pulita e strutturata per avviare le ricerche.
- **Ottimizzazione Categorie**: Un sistema di filtraggio bilanciato che mostra le categorie principali come tasti rapidi e le altre in un menù a tendina.
- **Micro-animazioni**: Feedback visivi fluidi durante la navigazione e il caricamento delle analisi.

---
*Prodotto con ❤️ dal team di sviluppo CosmoNet Pro.*
