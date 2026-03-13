# 🔍 Keyword Researcher

> Analizza il tuo sito, studia i competitor italiani e trova keyword + idee articolo personalizzate — powered by Claude AI con web search in tempo reale.

---

## ✨ Funzionalità

- **Scansione sito** — trova automaticamente gli articoli già pubblicati sul tuo dominio
- **Analisi competitor** — identifica i principali blog italiani nella tua nicchia
- **Keyword research** — 20+ keyword con difficoltà, intento di ricerca e volume stimato
- **Idee articoli nuovi** — suggerimenti basati sui gap rispetto ai competitor
- **Articoli da aggiornare** — indica cosa aggiungere agli articoli esistenti
- **Web search in tempo reale** — dati aggiornati, non basati su training statico

---

## 🚀 Stack

| Tecnologia | Uso |
|---|---|
| React + Vite | Frontend |
| Anthropic Claude API | AI + web search |
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

1. Inserisci il tuo dominio (es. `cosmonet.info`)
2. Scegli la nicchia o scrivi una personalizzata
3. Clicca **Avvia analisi completa**
4. L'AI esegue 4 fasi in sequenza:
   - Scansione articoli esistenti
   - Analisi competitor italiani
   - Ricerca keyword e gap
   - Generazione idee articoli
5. Naviga tra i tab: **Nuovi articoli**, **Da aggiornare**, **Keyword**, **Articoli esistenti**

---

## 🔒 Note di sicurezza

- La API key non è mai nel codice sorgente
- `.env.local` è escluso dal repo tramite `.gitignore`
- Il repo è privato — solo uso personale

---

## 👤 Autore

Daniele — [cosmonet.info](https://www.cosmonet.info)
