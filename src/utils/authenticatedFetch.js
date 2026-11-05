import { auth } from "../firebase";

export async function authenticatedFetch(path, options = {}) {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("Accedi con Google per usare questa funzione.");
  const headers = new Headers(options.headers);
  headers.set("X-Firebase-Token", await auth.currentUser.getIdToken());
  return fetch(path, { ...options, headers });
}
