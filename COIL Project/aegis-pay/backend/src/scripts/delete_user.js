// Delete a user completely from DB (wallet + transactions + user)
// Usage: node src/scripts/delete_user.js <email>

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

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
  console.error('Usage: node src/scripts/delete_user.js <email>');
  process.exit(1);
}

const pool = mysql.createPool({
  uri: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false },
});

console.log('⚠️ DELETING USER...');
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
    'SELECT wallet_id FROM wallets WHERE user_id = ?',
    [user.user_id]
  );

  if (wallets.length === 0) {
    console.error('User has no wallet.');
    process.exit(1);
  }

  const walletId = wallets[0].wallet_id;

  // 3. Delete transactions
  await pool.query(
    'DELETE FROM transactions WHERE sender_wallet_id = ? OR receiver_wallet_id = ?',
    [walletId, walletId]
  );

  console.log('✓ Deleted transactions');

  // 4. Delete wallet
  await pool.query(
    'DELETE FROM wallets WHERE wallet_id = ?',
    [walletId]
  );

  console.log('✓ Deleted wallet');

  // 5. Delete user
  await pool.query(
    'DELETE FROM users WHERE user_id = ?',
    [user.user_id]
  );

  console.log(`🔥 Deleted user: ${user.first_name} ${user.last_name} (${email})`);

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}