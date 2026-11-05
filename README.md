# Keyword Researcher

Applicazione editoriale di CosmoNet. Integra analisi SEO, Piano Editoriale,
Trend Monitor, Search Console e Archivio Markdown.

## Avvio

Installa le dipendenze con `npm ci` e usa `vercel dev` per frontend e API.
Per i controlli esegui `npm run lint` e `npm run build`.

## Configurazione

Copia `.env.example` in un file locale oppure imposta le variabili in Vercel.
Abilita Google in Firebase Authentication e autorizza il dominio dell'app.
Per gli endpoint protetti imposta `FIREBASE_ALLOWED_UID` con l'UID del
proprietario e `APP_ORIGIN` con l'origine esatta del deploy utilizzato.

I modelli predefiniti sono `openai/gpt-oss-120b` (Groq), `gemini-3.8-flash`
(Google) e `claude-sonnet-4-6` (Anthropic). Puoi sostituirli con
`GROQ_MODEL`, `GEMINI_MODEL` e `ANTHROPIC_MODEL`. Le chiavi dei provider
vanno impostate solo lato server. Le precedenti variabili Gemini e Groq con
prefisso `VITE_` restano disponibili come fallback server durante la transizione.

Per Archivio e MCP consulta [ARCHIVIO_EDITORIALE.md](ARCHIVIO_EDITORIALE.md).
Le credenziali WordPress continuano a risiedere in Firestore. L'accesso al
documento `config/wordpress` dipende dalle regole Firestore del progetto.

Per salvare la classificazione manuale, aggiungi alle regole Firestore del
progetto l'accesso per il solo proprietario al documento
`/seo_settings/{uid}` (`request.auth != null && request.auth.uid == uid`).
