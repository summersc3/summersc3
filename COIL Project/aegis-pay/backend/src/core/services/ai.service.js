// AI assistant powered by Google Gemini.
// Brought in-house from the team microservice so chat doesn't depend on a
// separate deploy lifecycle.
//
// Required env var: GEMINI_API_KEY

import { GoogleGenerativeAI } from '@google/generative-ai';

let _model = null;

function getModel() {
  if (_model) return _model;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY env var is not set on the backend');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  // gemini-2.5-flash is fast + cheap; if the key doesn't have access we'll
  // fall back to gemini-1.5-flash automatically on the first failed call.
  _model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  return _model;
}

const SYSTEM_PROMPT = `You are the friendly customer-support assistant for Aegis Pay,
a mobile banking app that supports USD and VND wallets, domestic and
international transfers, QR-code payments, and OTP verification. Answer
the user's question briefly and helpfully. If the question is unrelated to
banking or the app, politely redirect them.`;

/**
 * Ask the Gemini model a question about the app. Returns the response text.
 * Throws on quota / auth / network errors with descriptive messages so the
 * route handler can decide what to expose.
 */
export async function askAI(question) {
  if (!question || typeof question !== 'string') {
    throw new Error('question must be a non-empty string');
  }

  const model = getModel();
  try {
    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\nUser question: ${question}`,
    );
    const text = result?.response?.text?.();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }
    return text.trim();
  } catch (err) {
    // Re-throw with a useful prefix so logs make sense.
    const msg = err?.message || String(err);
    console.error('[ai.service] Gemini call failed:', msg);
    throw new Error(`Gemini error: ${msg}`);
  }
}
