// Currency conversion via exchangerate-api.com.
// Brought in-house from the team microservice so cross-country transfers
// don't depend on a separate deploy lifecycle.
//
// Required env var: EXCHANGE_RATE_API_KEY

// In-memory rate cache. Re-uses a single fetch across all conversions for
// up to 5 minutes — exchangerate-api free tier has limits.
const rateCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getLatestRates(base) {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'EXCHANGE_RATE_API_KEY env var is not set on the backend.',
    );
  }

  const cached = rateCache.get(base);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Exchange rate API HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data || !data.conversion_rates) {
    throw new Error('Invalid response from exchange rate API');
  }

  rateCache.set(base, { data, fetchedAt: Date.now() });
  return data;
}

/**
 * Convert `amount` from `senderCur` to `targetCur` using live FX rates.
 * Pivots through USD for stable triangulation.
 */
export async function convertCurrency(senderCur, targetCur, amount) {
  if (typeof senderCur !== 'string' || typeof targetCur !== 'string') {
    throw new Error('senderCur and targetCur are required ISO 4217 strings');
  }
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    throw new Error('amount must be a positive number');
  }

  // Same-currency short-circuit.
  if (senderCur === targetCur) return amount;

  const data = await getLatestRates('USD');
  const rates = data.conversion_rates;

  if (!rates[senderCur]) {
    throw new Error(`Unknown source currency: ${senderCur}`);
  }
  if (!rates[targetCur]) {
    throw new Error(`Unknown target currency: ${targetCur}`);
  }

  // amount * (USD→target) / (USD→sender)  derives the sender→target rate.
  return amount * (rates[targetCur] / rates[senderCur]);
}

/** Bare rate lookup (USD pivoted) — handy for previews. */
export async function getRate(senderCur, targetCur) {
  return convertCurrency(senderCur, targetCur, 1);
}
