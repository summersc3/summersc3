// Quick dev script to top up a user's wallet directly in MySQL.
// Usage:   node src/scripts/add_money.js <email> <amount>
// Example: node src/scripts/add_money.js phand2@udayton.edu 1000

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Load .env manually (avoids needing dotenv installed locally).
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

const [, , email, amountArg] = process.argv;

if (!email || !amountArg) {
  console.error('Usage: node src/scripts/add_money.js <email> <amount>');
  process.exit(1);
}

const amount = parseFloat(amountArg);
if (isNaN(amount) || amount <= 0) {
  console.error('Amount must be a positive number.');
  process.exit(1);
}

const pool = mysql.createPool({
  uri: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false },
});

if (!process.env.DATABASE_URI) {
  console.error('DATABASE_URI not loaded. Looked for .env at:', envPath);
  console.error('Exists?', fs.existsSync(envPath));
  process.exit(1);
}
console.log('Connecting to DB...');

try {
  // 1. Find the user
  const [users] = await pool.query(
    'SELECT user_id, first_name, last_name FROM users WHERE email = ?',
    [email]
  );
  if (users.length === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }
  const user = users[0];

  // 2. Find the wallet
  const [wallets] = await pool.query(
    'SELECT wallet_id, balance FROM wallets WHERE user_id = ?',
    [user.user_id]
  );
  if (wallets.length === 0) {
    console.error(`User ${email} has no wallet.`);
    process.exit(1);
  }
  const wallet = wallets[0];

  // 3. Top up
  const newBalance = parseFloat(wallet.balance) + amount;
  await pool.query(
    'UPDATE wallets SET balance = ? WHERE wallet_id = ?',
    [newBalance, wallet.wallet_id]
  );

  console.log(`✓ Added $${amount.toFixed(2)} to ${user.first_name} ${user.last_name} (${email})`);
  console.log(`  Old balance: $${parseFloat(wallet.balance).toFixed(2)}`);
  console.log(`  New balance: $${newBalance.toFixed(2)}`);
} catch (err) {
  console.error('Error code:', err?.code);
  console.error('Error message:', err?.message);
  console.error('Full error:', err);
  process.exit(1);
} finally {
  await pool.end();
}
