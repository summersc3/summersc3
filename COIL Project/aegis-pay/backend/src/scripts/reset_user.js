// Reset user wallet balance to 0 and delete all related transactions
// Usage: node src/scripts/reset_user.js <email>

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

console.log("SCRIPT STARTED");

// Load .env manually
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

const [, , email] = process.argv;

if (!email) {
  console.error('Usage: node src/scripts/reset_user.js <email>');
  process.exit(1);
}

const pool = mysql.createPool({
  uri: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false },
});

if (!process.env.DATABASE_URI) {
  console.error('DATABASE_URI not loaded.');
  process.exit(1);
}

console.log('⚠️ RESETTING USER DATA...');
console.log('Connecting to DB...');

try {
  // 1. Find user
  const [users] = await pool.query(
    'SELECT user_id, first_name, last_name FROM users WHERE email = ?',
    [email]
  );

  if (users.length === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const user = users[0];

  // 2. Get wallet
  const [wallets] = await pool.query(
    'SELECT wallet_id, balance FROM wallets WHERE user_id = ?',
    [user.user_id]
  );

  if (wallets.length === 0) {
    console.error(`User has no wallet.`);
    process.exit(1);
  }

  const wallet = wallets[0];

  // 3. Delete transactions (both sent & received)
  await pool.query(
    `
    DELETE FROM transactions
    WHERE sender_wallet_id = ? OR receiver_wallet_id = ?
    `,
    [wallet.wallet_id, wallet.wallet_id]
  );

  console.log('✓ Deleted all related transactions');

  // 4. Reset balance to 0
  await pool.query(
    'UPDATE wallets SET balance = 0 WHERE wallet_id = ?',
    [wallet.wallet_id]
  );

  console.log(`✓ Reset balance to 0 for ${user.first_name} ${user.last_name}`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}