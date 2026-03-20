# 📖 CosmoNet Keyword Researcher Pro - Guida all'Uso

Benvenuto nella guida utente per **CosmoNet Keyword Researcher Pro**. 
Questo strumento è stato progettato per semplificare e automatizzare il flusso SEO del blog *cosmonet.info*, integrando i dati di Google Search Console, feed RSS di tendenza e l'Intelligenza Artificiale Generativa.

---

## 🧭 Navigazione Principale

L'interfaccia si divide in tre sezioni principali:
1. **🚀 Analisi Keyword**: Per trovare nuove idee di contenuto analizzando la nicchia.
2. **📈 GSC Insights**: Per monitorare il traffico attuale e identificare opportunità di miglioramento (Quick Wins).
3. **📅 Piano Editoriale**: Per la gestione Kanban degli articoli in lavorazione.
4. **📡 Trend Monitor**: Per analizzare i feed RSS dei competitor e trovare notizie calde in tempo reale.

---

## 🕹 Flusso di Lavoro Consigliato (Workflow)

### 1. Trovare Argomenti Caldi (Trend Monitor)
Inizia la tua giornata editoriale scoprendo di cosa parla il mondo tech:
1. Vai su **Trend Monitor** dalla barra laterale.
2. Clicca su **Aggiorna Feed** per scaricare gli ultimi articoli (Linux, AI, Tech, ecc.).
3. Scorri le notizie più rilevanti.
4. Hai trovato uno spunto interessante? Clicca sul pulsante **"Aggiungi a Piano"** per inserirlo immediatamente come "Da scrivere" nel tuo Piano Editoriale.

### 2. Sfruttare le Opportunità GSC (Quick Wins)
L'ottimizzazione del traffico esistente garantisce risultati più veloci della creazione di nuovi contenuti:
1. Vai su **GSC Insights**.
2. Clicca sul pulsante **Carica Dati GSC**. (Il tool autenticherà il tuo account Google e scaricherà i dati sulle prestazioni degli ultimi 28 giorni).
3. Cerca tra le keyword quelle marchiate con il **badge blu "Quick Win"**. Queste sono le parole chiave attualmente posizionate tra il 5° e 20° posto su Google con alte impressioni.
4. Clicca sull'icona della **scintilla (Analizza con AI)** accanto a una keyword "Quick Win". 
   - Questo pre-compilerà il form di "Analisi Keyword" in "Modalità Quick Win".
   - L'AI (es. Groq/Llama 3.3) non ti suggerirà articoli generici, ma strategie avanzate per scalare in Top 3.

### 3. Analisi Keyword Profonda
Se vuoi dominare una nuova nicchia o espandere un topic esistente:
1. Vai su **Analisi Keyword**.
2. Inserisci l'URL target (predefinito: *cosmonet.info*) e il **Topic** (es. "Ubuntu 24.04").
3. Scegli il provider AI (consigliato: **Groq** per bilanciamento costi/velocità, **Gemini 2.0** per velocità, o **Claude 3.5** per precisione logica estrema).
4. *(Opzionale)* Inserisci keyword specifiche che vuoi che l'AI consideri.
5. Clicca **Analizza Sito**. Il sistema contatterà Google (Serper), leggerà gli ultimi Trend RSS per non suggerirti argomenti vecchi e ti restituirà:
   - Competitor italiani e internazionali.
   - Keyword a bassa difficoltà/alto volume.
   - Idee di articoli divisi tra "Nuovi" e "Da aggiornare".
6. Clicca l'icona "+" su un'idea di articolo per aggiungerla al tuo **Piano Editoriale**.

### 4. Organizzazione nel Piano Editoriale
Questa è la tua Dashboard Kanban operativa.
1. Vai su **Piano Editoriale**.
2. Passa alla **Vista Tabella** o mantieni la **Vista Cards** (Kanban).
3. Puoi filtrare la tabella attivando l'interruttore **"Solo Quick Wins"** (per concentrarti prima sugli articoli ad alto impatto).
4. **Sincronizza WordPress**: Clicca su "Sync WP" per importare le bozze e capire cosa è già schedulato o pubblicato nel CMS reale.

### 5. Generazione del Brief AI
Quando sei pronto a passare un articolo a un Copywriter o a scriverlo tu stesso:
1. Nel Piano Editoriale, espandi i dettagli di una card "Da Scrivere".
2. Clicca sul pulsante **"Genera Brief (AI)"**.
3. Il pulsante diventerà blu (In elaborazione). L'AI analizzerà il titolo e creerà una sintesi del contesto, la struttura SEO, suggerimenti sui dati (reali, anno 2026), e il target.
4. Al termine, il brief verrà **copiato automaticamente nei tuoi appunti**. Incollalo su Google Docs o nella bozza di WordPress!

---

## ❗ Risoluzione Problemi Comuni

- **Errore 500 durante Genera Brief / Analisi**: Controlla che le variabili d'ambiente in `.env.local` e in Vercel (`GROQ_API_KEY`, ecc.) siano correttamente popolate e valide.
- **Vedo solo argomenti vecchi nell'analisi**: Questo tool ha un vincolo stringente di focalizzarsi sempre sul 2026 e sulle tecnologie attuali. Se accade, assicurati di selezionare un Topic molto specifico e aggiornato.
- **Nessun dato in GSC Insights**: Accertati di fare il login con l'account Google che ha privilegi di proprietario/amministratore per la property *https://cosmonet.info* in Google Search Console.
