# Attivare l’Archivio editoriale

L’archivio usa il progetto Firebase già configurato in Vercel. Le note sono
salvate in `archivio_editoriale/{uid}/note/{noteId}`. L’accesso a Firebase
Authentication è separato dal collegamento a Search Console.

1. Nella console Firebase, abilita **Authentication → Metodo di accesso → Google**
   e aggiungi il dominio dell’app in **Authentication → Impostazioni → Domini
   autorizzati**.
2. In **Firestore Database → Regole**, integra questo blocco nel
   `match /databases/{database}/documents` esistente:

   ```text
   match /archivio_editoriale/{uid}/note/{noteId} {
     allow read, create, update: if request.auth != null && request.auth.uid == uid;
   }
   ```

   Mantieni le regole delle altre raccolte. Se una regola ricorsiva o un’altra
   regola sovrapposta concede accesso al percorso dell’archivio, restringila prima
   di attivare la funzione. Firestore concede l’accesso se qualunque regola
   applicabile lo consente. Verifica che il proprietario possa leggere e salvare
   una nota e che un altro UID e un utente anonimo siano respinti.
3. In Vercel, imposta `VITE_EDITORIAL_ARCHIVE_ENABLED=true` per Production e
   fai un nuovo deploy. Apri **Archivio editoriale** dal menu e accedi con Google.

## Collegare l'archivio via MCP

Il server Streamable HTTP è disponibile su `/api/mcp` quando è configurato.
La prima versione collega un singolo account OAuth a un singolo archivio
Firebase e offre `search`, `fetch` e `follow_note_links` in sola lettura.

1. Configura un provider OAuth compatibile con MCP e Authorization Code + PKCE.
   Il provider deve pubblicare i propri metadati di discovery, accettare il
   parametro `resource` e rilasciare access token JWT firmati RS256 con
   audience uguale all'URL MCP e scope `archive:read`. Configura per ChatGPT e
   Claude una modalità di registrazione client supportata dal provider.
2. Crea un account di servizio Google Cloud dedicato, con accesso Firestore in
   sola lettura, ad esempio con il ruolo **Cloud Datastore Viewer**. La chiave
   deve essere salvata soltanto nelle variabili server di Vercel. L'account
   di servizio usa IAM e le regole Firestore per il browser non lo limitano.
3. Aggiungi queste variabili server per Production in Vercel:

   | Variabile | Valore |
   | --- | --- |
   | `MCP_RESOURCE_URL` | `https://keyword-researcher-three.vercel.app/api/mcp` |
   | `MCP_OAUTH_ISSUER` | Issuer esatto pubblicato dal provider OAuth |
   | `MCP_OAUTH_JWKS_URL` | URL HTTPS `jwks_uri` del provider |
   | `MCP_OAUTH_SUBJECT` | Claim `sub` dell'account autorizzato dal provider |
   | `MCP_FIREBASE_UID` | UID dell'utente proprietario delle note in Firebase Authentication |
   | `MCP_SERVICE_ACCOUNT_JSON` | JSON dell'account di servizio del progetto Firebase |

   Il progetto Firestore è quello già indicato da `VITE_FIREBASE_PROJECT_ID`.
4. Esegui un redeploy. In ChatGPT o Claude aggiungi il connettore usando l'URL
   MCP e completa l'autorizzazione con l'account configurato. Prima verifica che
   una richiesta senza token riceva HTTP 401 e che l'accesso con l'account
   autorizzato mostri soltanto le sue note.

La ricerca considera al massimo le 1.000 note aggiornate più di recente.
Il server segnala quando i risultati sono troncati.

[Autenticazione MCP in ChatGPT](https://developers.openai.com/plugins/build/auth) ·
[Connettori MCP in Claude](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)

### Accesso alle altre sezioni

Per autorizzare il connettore a navigare nell'app e leggere Piano Editoriale,
cronologia e contesto condiviso, configura anche lo scope `editorial:read`
nel provider OAuth e autorizza nuovamente il client con entrambi gli scope.
Il solo `archive:read` continua a dare accesso alle note.

Per condividere RSS, notizie e Search Console, integra anche questa regola
all'interno del blocco Firestore dei documenti:

```text
match /archivio_editoriale/{uid}/contesto/mcp {
  allow read, create, update: if request.auth != null && request.auth.uid == uid;
}
```

Dopo aver caricato i dati in Trend Monitor o GSC Insights, apri **Archivio
editoriale → Dati condivisi con MCP**. Seleziona cosa condividere. Il pannello
può anche rimuovere le copie condivise. I risultati riportano le date di
caricamento e condivisione. Nessun token Google Search Console viene salvato.
Le sezioni vengono aperte tramite link; le operazioni MCP sono in sola lettura.

Se Firestore richiede un indice per il filtro del Piano Editoriale, crea un
indice composito sulla raccolta `piano_editoriale` con `status` crescente e
`createdAt` decrescente.
