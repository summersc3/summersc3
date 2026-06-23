// One-shot migration: adds amount_sent / amount_received / currency_sent /
// currency_received to the transactions table, then backfills existing rows.
//
// Run from the backend folder:
//   node src/scripts/add_amount_columns.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

if (!process.env.DATABASE_URI) {
  console.error('DATABASE_URI not set');
  process.exit(1);
}

const pool = mysql.createPool({
  uri: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false },
});

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return rows[0].n > 0;
}

async function addColumnIfMissing(name, definition) {
  if (await columnExists('transactions', name)) {
    console.log(`= column ${name} already exists`);
    return;
  }
  await pool.query(`ALTER TABLE transactions ADD COLUMN ${name} ${definition}`);
  console.log(`+ added column ${name}`);
}

try {
  await addColumnIfMissing('amount_sent', 'DECIMAL(18,2) NULL');
  await addColumnIfMissing('amount_received', 'DECIMAL(18,2) NULL');
  await addColumnIfMissing('currency_sent', 'VARCHAR(10) NULL');
  await addColumnIfMissing('currency_received', 'VARCHAR(10) NULL');

  // Backfill: assume domestic transfer for existing rows (sender == receiver currency).
  const [updated] = await pool.query(
    `UPDATE transactions t
     JOIN wallets ws ON t.sender_wallet_id = ws.wallet_id
     JOIN wallets wr ON t.receiver_wallet_id = wr.wallet_id
     SET t.amount_sent = COALESCE(t.amount_sent, t.amount),
         t.amount_received = COALESCE(t.amount_received, t.amount),
         t.currency_sent = COALESCE(t.currency_sent, ws.currency),
         t.currency_received = COALESCE(t.currency_received, wr.currency)
     WHERE t.amount_sent IS NULL
        OR t.amount_received IS NULL
        OR t.currency_sent IS NULL
        OR t.currency_received IS NULL`,
  );
  console.log(`Backfilled ${updated.affectedRows} existing rows.`);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
