# Keyword Researcher & Piano Editoriale AI

Keyword Researcher è una Single Page Application (SPA) avanzata progettata per automatizzare la ricerca di parole chiave, l'analisi dei competitor e la gestione di un piano editoriale strutturato. Il sistema utilizza vari motori di Intelligenza Artificiale (Groq/LLaMA 3.3, Gemini, Claude) per generare insight strategici partendo da un URL e una nicchia di riferimento.

## 🚀 Caratteristiche Principali

### 1. **Analisi & Keyword Strategy**
- **Scansione Intelligente**: Analizza siti web esistenti per identificare lacune di contenuto.
- **Ricerca Keyword**: Identifica parole chiave target con difficoltà, intento di ricerca e volumi stimati.
- **Analisi Competitor**: Monitora i principali attori della nicchia e i loro punti di forza.
- **Generazione Idee Articoli**: Suggerisce nuovi contenuti e aggiornamenti per articoli esistenti.

### 2. **Piano Editoriale (Dashboard Real-time)**
- **Sincronizzazione WordPress**: Importa automaticamente articoli pubblicati e programmati tramite REST API.
- **Filtri Avanzati**: Gestione dei contenuti per Anno (2025, 2026, ecc.) e Mesi reali (Gennaio, Febbraio...).
- **Vista Calendario**: Visualizzazione temporale della strategia di pubblicazione.
- **Check SEO**: Analisi "on-page" rapida per verificare la presenza di keyword in Titolo, H1 e immagini.

### 3. **Automazione & UX**
- **Deduplicazione**: Identificazione automatica di articoli già presenti nel piano per evitare doppioni.
- **Aggiunta Massiva**: Inserimento veloce di decine di idee nel piano editoriale con un solo click.
- **Responsive Design**: Ottimizzato per l'uso professionale su Desktop e per la consultazione rapida su Mobile.

## 🛠 Architettura Tecnica

- **Frontend**: React (Vite) con CSS Vanilla (Design Premium/Glassmorphism).
- **Database e Auth**: Firebase Firestore per la persistenza real-time dei dati.
- **Backend (Serverless)**:
  - `api/analyze.js`: Orchestrazione delle chiamate AI e parsing dei risultati.
  - `api/wp-fetch.js`: Integrazione sicura con WordPress (Application Passwords).
  - `api/check-published.js`: Scraping leggero e check SEO.
- **AI Engine**: Supporto multi-provider tramite API esterne (Groq, Google AI, Anthropic).

## 📂 Struttura del Progetto

```text
/
├── api/                # Funzioni Serverless (Vercel/Node.js)
│   ├── analyze.js      # Core AI Analysis
│   ├── wp-fetch.js     # WP REST API Bridge
│   └── ...
├── src/                # Sorgenti Frontend
│   ├── components/     # Componenti React (PianoEditoriale, Dashboard...)
│   ├── App.jsx         # Componente principale e Router logico
│   ├── firebase.js     # Configurazione Database
│   └── index.css       # Design System e stili globali
├── public/             # Asset statici e Manifest PWA
└── .env                # Variabili d'ambiente (API Keys, Firebase Config)
```

## ⚙️ Configurazione per lo Sviluppo

1. **Installazione**: `npm install`
2. **Setup Ambiente**: Crea un file `.env` basato su `.env.example` con le chiavi API per Firebase, Groq, Gemini e Claude.
3. **Esecuzione Locale**:
   - Frontend: `npm run dev`
   - API e Full Stack: `vercel dev` (consigliato per testare la sincronizzazione WordPress).

---
*Progetto sviluppato da Antigravity per CosmoNet.*
