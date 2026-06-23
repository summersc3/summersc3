// One-shot migration: align wallet.currency with each user's phone country.
// Run from the backend folder:
//   node src/scripts/migrate_wallet_currency.js
//
// Behavior:
//   +84*  → VND
//   +1*   → USD
//   else  → leave as-is (or USD if currency was empty)
//
// NOTE: only the currency *label* is updated; the balance number is unchanged.
// Use the add_money script afterwards if you want to top up the new currency.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Load .env manually (avoids dotenv dependency).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

if (!process.env.DATABASE_URI) {
  console.error('DATABASE_URI not loaded. Looked for .env at:', envPath);
  process.exit(1);
}

const pool = mysql.createPool({
  uri: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false },
});

function currencyForPhone(phone) {
  if (!phone) return null;
  if (phone.startsWith('+84')) return 'VND';
  if (phone.startsWith('+1')) return 'USD';
  return null;
}

try {
  const [users] = await pool.query(
    `SELECT u.user_id, u.email, u.phone, w.wallet_id, w.currency
     FROM users u
     JOIN wallets w ON u.user_id = w.user_id`
  );

  let changed = 0;
  let kept = 0;
  for (const u of users) {
    const target = currencyForPhone(u.phone);
    if (!target) {
      console.log(`-  ${u.email} (${u.phone}) → keep ${u.currency}`);
      kept++;
      continue;
    }
    if (u.currency === target) {
      console.log(`=  ${u.email} (${u.phone}) → already ${target}`);
      kept++;
      continue;
    }
    await pool.query(
      'UPDATE wallets SET currency = ? WHERE wallet_id = ?',
      [target, u.wallet_id]
    );
    console.log(
      `✓  ${u.email} (${u.phone}) → ${u.currency || '(none)'} → ${target}`,
    );
    changed++;
  }

  console.log(`\nDone. Updated: ${changed}, unchanged: ${kept}`);
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}
