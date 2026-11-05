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
