/* global process */
import { createRemoteJWKSet, jwtVerify } from "jose";

const keys = createRemoteJWKSet(new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
));

export function appOriginAllowed(req, res, methods = "POST, OPTIONS") {
  const origin = req.headers.origin;
  const allowed = process.env.APP_ORIGIN || "https://keyword-researcher-three.vercel.app";
  res.setHeader("Vary", "Origin");
  if (origin && origin !== allowed) {
    res.status(403).json({ error: "Origine non autorizzata." });
    return false;
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
    res.setHeader("Access-Control-Allow-Methods", methods);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Firebase-Token");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }
  return true;
}

export async function requireAppUser(req, res) {
  if (!appOriginAllowed(req, res)) return false;
  const token = req.headers["x-firebase-token"];
  const project = process.env.VITE_FIREBASE_PROJECT_ID;
  const owner = process.env.FIREBASE_ALLOWED_UID;
  try {
    if (!token || typeof token !== "string" || !project || !owner) throw new Error();
    const { payload } = await jwtVerify(token, keys, {
      issuer: `https://securetoken.google.com/${project}`,
      audience: project,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "exp", "iat", "auth_time"],
    });
    const now = Math.floor(Date.now() / 1000);
    if (payload.sub !== owner || payload.iat > now ||
      typeof payload.auth_time !== "number" || payload.auth_time > now) throw new Error();
    return true;
  } catch {
    res.status(401).json({ error: "Accedi con l’account Firebase autorizzato." });
    return false;
  }
}
