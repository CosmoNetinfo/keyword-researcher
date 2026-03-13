# 🔍 Keyword Researcher

> Strumento SEO personale per analizzare il tuo sito, studiare i competitor italiani e pianificare i contenuti — powered by Claude AI con web search in tempo reale.

---

## ✨ Funzionalità

### Analisi AI
- **Scansione sito** — trova automaticamente gli articoli già pubblicati sul tuo dominio
- **Analisi competitor** — identifica i principali blog italiani nella tua nicchia
- **Keyword research** — 20+ keyword con difficoltà, intento di ricerca e volume stimato
- **Nuovi articoli** — idee basate sui gap rispetto ai competitor
- **Articoli da aggiornare** — cosa aggiungere agli articoli esistenti e perché
- **Web search in tempo reale** — dati aggiornati, non basati su training statico

### Gestione e tracking
- **Storico analisi** — tutte le analisi salvate localmente, consultabili in qualsiasi momento
- **Stato keyword** — da fare → in lavorazione → fatto ✓
- **Stato articoli** — da scrivere → in lavorazione → pubblicato ✓
- **Confronto nel tempo** — rivedi analisi passate per misurare i progressi

### Export
- **Export CSV / Excel** — tutti i dati in un file `.csv` con sezioni separate per keyword, articoli, competitor
- **Export Word** — report formattato `.doc` con tabelle, pronto da stampare o condividere

---

## 🚀 Stack

| Tecnologia | Uso |
|---|---|
| React + Vite | Frontend |
| Anthropic Claude API | AI + web search in tempo reale |
| localStorage | Salvataggio analisi (zero database) |
| Vercel | Deploy |

---

## ⚙️ Setup locale

### 1. Clona il repo e installa le dipendenze

```bash
git clone https://github.com/TUO-USERNAME/keyword-researcher.git
cd keyword-researcher
npm install
```

### 2. Crea il file `.env.local` nella root

```
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

> Ottieni la tua API key su [console.anthropic.com](https://console.anthropic.com)

### 3. Avvia in locale

```bash
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173)

---

## 🌐 Deploy su Vercel

1. Importa il repo su [vercel.com/new](https://vercel.com/new)
2. Aggiungi la variabile d'ambiente:
   - Nome: `VITE_ANTHROPIC_API_KEY`
   - Valore: la tua API key
3. Clicca **Deploy**

Ogni push su `main` aggiorna automaticamente il deploy.

---

## 📖 Come si usa

### Nuova analisi
1. Inserisci il tuo dominio (es. `cosmonet.info`)
2. Scegli la nicchia o scrivine una personalizzata
3. Clicca **Avvia analisi completa**
4. L'AI esegue 4 fasi in sequenza:
   - Scansione articoli esistenti sul sito
   - Analisi competitor italiani
   - Ricerca keyword e gap di contenuto
   - Generazione idee articoli personalizzate
5. Naviga tra i tab: **Nuovi articoli · Da aggiornare · Keyword · Competitor · Esistenti**

### Tracking
- Clicca sul badge di stato di una keyword o articolo per aggiornarlo
- Lo stato si salva automaticamente nel browser

### Storico
- Clicca su **Storico** in alto per vedere tutte le analisi passate
- Puoi aprire, esportare o eliminare ogni analisi

---

## 💾 Dati e privacy

- Tutti i dati vengono salvati in **localStorage** — rimangono nel browser, zero server
- La API key non è mai nel codice sorgente — gestita tramite variabili d'ambiente
- Il repo è privato — solo uso personale

---

## 👤 Autore

Daniele — [cosmonet.info](https://www.cosmonet.info)
