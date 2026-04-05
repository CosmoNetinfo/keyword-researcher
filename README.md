# 🚀 CosmoNet Keyword Researcher & Editorial Suite (Ultimate Edition v5.0)

**CosmoNet Keyword Researcher Pro** è una suite di intelligenza artificiale di classe enterprise per SEO e Content Automation, progettata per dominare la SERP di `cosmonet.info`.
Questa versione trasforma il workflow editoriale in un processo semi-autonomo, integrando analisi dei competitor, generazione visuale, social kit e algoritmi di recupero ranking.

---

## 🌟 Novità della Versione 5.0 (Enterprise Suite)

### 📈 1. Search Insights & Deep Analytics
- **Dashboard Grafica Interattiva**: Monitoraggio in tempo reale di Clic e Impressioni tramite grafici dinamici (Recharts).
- **Cannibalization Detector**: Algoritmo specializzato che identifica query dove più pagine competono inefficacemente, suggerendo azioni di merging o differenziazione.
- **Low CTR Optimizer**: Filtro automatico per catturare le "Gold Opportunities" (keyword in top position ma con bassi clic).

### 🤖 2. Content Power-up & Recovery Bot
- **SEO Recovery Bot**: Sistema proattivo che rileva i "Rank Drop" e genera istantaneamente un **Piano di Recupero** basato sui nuovi intent dei competitor.
- **Competitor-Aware Briefs**: Generazione di brief che includono dati reali estrapolati dai top 5 competitor in SERP tramite Serper.dev.
- **Daily Briefing**: Una scheda dedicata che riassume le 3 azioni prioritarie per la giornata.

### 🎨 3. Visual & Social Automation
- **AI Image Generation (Gratuita)**: Integrazione con Pollinations.ai per creare illustrazioni editoriali professionali on-demand e senza costi.
- **Social Media Kit**: Generazione automatica di post ottimizzati per LinkedIn, X (Twitter) e Telegram per massimizzare la distribuzione del contenuto.

### 🔌 4. Workflow Seamless (WordPress)
- **One-Click WP Draft**: Esporta i brief generati direttamente come bozze su WordPress.
- **Auto-Linking Intelligente**: Iniezione automatica di link interni correlati ("Leggi anche") a fine articolo per potenziare il PageRank interno.

---

## 🛠 Stack Tecnologico

- **Frontend**: React 19 + Vite + Tailwind CSS + Recharts
- **Database**: Firebase Firestore (Sync in tempo reale)
- **Backend / API**: Vercel Serverless Functions (Node.js)
- **AI Engine**: 
  - **Text**: Groq (Llama-3.3-70b-versatile), Gemini 2.0 Flash, Claude 3.5 Sonnet.
  - **Images**: Pollinations.ai (Free/Fast).
  - **Search**: Serper.dev (Real-time Google SERP Data).
- **GSC**: Google Search Console API (v1).

---

## 🚀 Setup e Configurazione

### Installazione
```bash
npm install
```

### Variabili d'Ambiente (.env)
Assicurati che le seguenti siano configurate nel tuo profilo Vercel o file `.env` locale:
```env
VITE_FIREBASE_API_KEY="xxx"
GROQ_API_KEY="xxx" (Richiesta per Social Kit & Recovery)
SERPER_API_KEY="xxx" (Richiesta per Competitor Analysis & KD reale)
VITE_GSC_CLIENT_ID="xxx" (Autenticazione GSC)
GEMINI_API_KEY="xxx"
ANTHROPIC_API_KEY="xxx"
```

### Esecuzione
Frontend + API (Proxy Vercel):
```bash
vercel dev
```

---

## 📝 Workflow Consigliato
1. Apri **GSC Insights** e identifica un **Quick Win**.
2. Clicca su **Analizza** per studiare il competitor.
3. Genera il **Brief SEO** arricchito.
4. Genera l'**Immagine AI** e il **Social Kit**.
5. Clicca su **Crea Bozza WP** per avere tutto pronto sul CMS.

---

*Prodotto con ❤️ dal team di sviluppo CosmoNet Pro per il futuro dell'editoria digitale.*
