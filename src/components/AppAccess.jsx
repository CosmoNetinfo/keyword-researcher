import { useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";

export default function AppAccess({ children }) {
  const [user, setUser] = useState(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => onAuthStateChanged(auth, setUser, error => {
    setError(error.message);
    setUser(null);
  }), []);

  async function signIn() {
    setPending(true);
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }

  if (user) return children;
  return (
    <main className="mx-auto mt-12 max-w-md space-y-4 p-4">
      <h1 className="text-2xl font-bold">Keyword Researcher</h1>
      {user === undefined ? <p role="status">Verifica dell’accesso…</p> : (
        <button type="button" onClick={signIn} disabled={pending}
          className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white disabled:opacity-50">
          Accedi con Google
        </button>
      )}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
    </main>
  );
}
