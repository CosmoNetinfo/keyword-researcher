/* global process */
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function readModelResponse(response, model, variable) {
  if (response.status === 404) {
    throw new Error(`Modello ${model} non disponibile. Verifica il valore di ${variable} su Vercel.`);
  }
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(`Il provider AI ha rifiutato la richiesta (${response.status}). Verifica configurazione e quota.`);
  }
  return data;
}
