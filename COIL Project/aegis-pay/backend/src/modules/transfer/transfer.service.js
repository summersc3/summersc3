import crypto from 'crypto';
import pool from '../../core/db/mysql.js';
import { OTPService } from '../../core/services/otp.service.js';
import { convertCurrency } from '../../core/services/currency.service.js';

const MIN_TRANSFER_AMOUNT = 1;
// Per-currency upper bound. VND figures are large by nature.
const MAX_TRANSFER_AMOUNT_BY_CURRENCY = {
  USD: 10000,
  VND: 250_000_000,
};
const DEFAULT_MAX_TRANSFER_AMOUNT = 10000;


function generateReferenceCode() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 899999 + 100000);
  return `FT${date}${random}`;
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
}

function maskEmail(email) {
  if (!email) return '****';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

// Look up a recipient by email or phone. Tries several phone format
// candidates so users can paste a local number (e.g. "0907034607") and still
// match a row stored in E.164 ("+84907034607"). Email lookup is exact.
export async function lookupRecipient(identifier) {
  const phoneCandidates = generatePhoneCandidates(identifier);
  const placeholders = phoneCandidates.map(() => '?').join(',') || "''";

  const [rows] = await pool.query(
    `SELECT u.user_id, u.first_name, u.last_name, u.phone, u.email, w.wallet_id, w.status as wallet_status
     FROM users u
     JOIN wallets w ON u.user_id = w.user_id
     WHERE u.email = ? OR u.phone IN (${placeholders})
     LIMIT 1`,
    [identifier, ...phoneCandidates]
  );

  if (rows.length === 0) return null;
  const user = rows[0];

  return {
    userId: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    maskedPhone: maskPhone(user.phone),
    maskedEmail: maskEmail(user.email),
    phoneCountry: detectPhoneCountry(user.phone),
    walletId: user.wallet_id,
    walletStatus: user.wallet_status,
  };
}

/**
 * Build a list of phone format variants from raw user input so the lookup
 * matches whether the recipient stored their number locally or in E.164.
 *
 *   "0907034607"        →  ["0907034607",  "+84907034607"]
 *   "907034607"         →  ["907034607",   "+84907034607"]
 *   "5551234567"        →  ["5551234567",  "+15551234567"]
 *   "+15551234567"      →  ["+15551234567"]
 *   "phand2@email.com"  →  []  (handled as email)
 */
function generatePhoneCandidates(input) {
  if (!input || typeof input !== 'string') return [];
  const trimmed = input.trim();

  // Already E.164 — use as-is.
  if (trimmed.startsWith('+')) return [trimmed];

  // Strip common separators.
  const cleaned = trimmed.replace(/[\s\-().]/g, '');
  // If non-numeric (e.g. contains @), skip phone branch.
  if (!/^\d+$/.test(cleaned)) return [];

  const candidates = new Set([cleaned]);

  // VN local: leading 0 + 9 digits (e.g. 0907034607 → +84907034607)
  if (cleaned.startsWith('0') && cleaned.length >= 9) {
    candidates.add('+84' + cleaned.slice(1));
  }

  // VN without leading zero (e.g. 907034607 → +84907034607)
  if (!cleaned.startsWith('0') && cleaned.length === 9) {
    candidates.add('+84' + cleaned);
  }

  // US 10-digit (e.g. 5551234567 → +15551234567)
  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    candidates.add('+1' + cleaned);
  }

  // US 11-digit starting with 1 (e.g. 15551234567 → +15551234567)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    candidates.add('+' + cleaned);
  }

  return Array.from(candidates);
}

// Country code from E.164 phone prefix. Falls back to local-format heuristics
// for legacy rows that may have been stored without the country code.
export function detectPhoneCountry(phone) {
  if (!phone) return 'OTHER';
  const p = String(phone).replace(/[\s\-().]/g, '');
  if (p.startsWith('+1')) return 'US';
  if (p.startsWith('+84')) return 'VN';
  // Legacy local formats — make a best guess.
  if (p.startsWith('0') && p.length >= 9 && p.length <= 11) return 'VN';
  return 'OTHER';
}

// Start a new transfer (creates a pending record)

export async function initiateTransfer(senderUserId, receiverIdentifier, amount, description) {
  // 1. Basic validation
  if (amount < MIN_TRANSFER_AMOUNT) {
    throw new TransferError(`Minimum transfer amount is ${MIN_TRANSFER_AMOUNT.toLocaleString('en-US')}`);
  }

  // 2. Look up receiver wallet (Do this first for UX: check if same user before balance)
  const receiver = await lookupRecipient(receiverIdentifier);
  if (!receiver) throw new TransferError('Recipient not found');
  if (receiver.userId === senderUserId) throw new TransferError('Cannot transfer to yourself');
  if (receiver.walletStatus !== 'active') throw new TransferError('Recipient wallet is not active');

  // 3. Look up sender wallet (with currency for the cap check)
  const [senderRows] = await pool.query(
    'SELECT wallet_id, balance, status, currency FROM wallets WHERE user_id = ?',
    [senderUserId]
  );
  if (senderRows.length === 0) throw new TransferError('Sender wallet not found');
  const senderWallet = senderRows[0];
  if (senderWallet.status !== 'active') throw new TransferError('Your account is currently locked');

  const maxForCurrency =
    MAX_TRANSFER_AMOUNT_BY_CURRENCY[senderWallet.currency] ||
    DEFAULT_MAX_TRANSFER_AMOUNT;
  if (amount > maxForCurrency) {
    throw new TransferError(
      `Maximum transfer is ${maxForCurrency.toLocaleString('en-US')} ${senderWallet.currency}`,
    );
  }
  if (parseFloat(senderWallet.balance) < amount) throw new TransferError('Insufficient balance for this transaction');

  const transactionId = crypto.randomUUID();
  const referenceCode = generateReferenceCode();

  // SECURE: Sweep MySQL natively and cancel any previous hovering pending transactions to enforce a 1-to-1 Twilio verification state mapping
  await pool.query(
    "UPDATE transactions SET status = 'cancelled', description = 'Cancelled implicitly via generation of a newer transaction sequence' WHERE sender_wallet_id = ? AND status = 'pending'",
    [senderWallet.wallet_id]
  );

  // Natively trigger Twilio Verify microservice immediately!
  // Skip when SKIP_OTP=true (demo / trial-account workaround so teammates
  // don't each need to verify their phone in the Twilio console).
  if (process.env.SKIP_OTP !== 'true') {
    await OTPService.generateOTP(senderUserId);
  } else {
    console.log('[transfer] SKIP_OTP enabled — bypassing Twilio SMS send');
  }

  // Look up receiver wallet currency so we can stamp currency_sent / currency_received.
  const [recvWalletRows] = await pool.query(
    'SELECT currency FROM wallets WHERE wallet_id = ?',
    [receiver.walletId],
  );
  const receiverCurrencyAtInit =
    recvWalletRows[0]?.currency || senderWallet.currency || 'USD';
  const senderCurrencyAtInit = senderWallet.currency || 'USD';

  await pool.query(
    `INSERT INTO transactions (
      transaction_id, sender_wallet_id, receiver_wallet_id, reference_code,
      amount, amount_sent, currency_sent, currency_received,
      transaction_type, status, description, created_at,
      otp_code, otp_expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'transfer', 'pending', ?, NOW(), NULL, NULL)`,
    [
      transactionId,
      senderWallet.wallet_id,
      receiver.walletId,
      referenceCode,
      amount,
      amount,
      senderCurrencyAtInit,
      receiverCurrencyAtInit,
      description || null,
    ]
  );

  return {
    transactionId,
    referenceCode,
    amount,
    receiver: {
      name: `${receiver.firstName} ${receiver.lastName}`,
      maskedPhone: receiver.maskedPhone,
    },
    createdAt: new Date().toISOString(),
  };
}

// Run the actual transfer (uses SQL transactions for safety)
export async function executeTransfer(transactionId, senderUserId, otpCode) {
  // Validate Twilio hash synchronously outside of the SQL transaction strictly to prevent lock blocking bounds!
  // SKIP_OTP bypasses verification too — any code the user enters is accepted.
  if (process.env.SKIP_OTP !== 'true') {
    try {
      await OTPService.verifyOTP(senderUserId, otpCode);
    } catch (twilioErr) {
      throw new TransferError(twilioErr.message);
    }
  } else {
    console.log('[transfer] SKIP_OTP enabled — bypassing OTP verification');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch and lock transaction record natively (No OTP checks needed)
    const [txRows] = await connection.query(
      'SELECT * FROM transactions WHERE transaction_id = ? FOR UPDATE',
      [transactionId]
    );
    if (txRows.length === 0) throw new TransferError('Transaction does not exist');
    const tx = txRows[0];
    if (tx.status !== 'pending') throw new TransferError(`This transaction is already ${tx.status === 'completed' ? 'completed' : 'failed'}`);

    // 2. Fetch and lock sender wallet, confirming ownership
    const [senderRows] = await connection.query(
      'SELECT wallet_id, balance, currency FROM wallets WHERE user_id = ? AND wallet_id = ? FOR UPDATE',
      [senderUserId, tx.sender_wallet_id]
    );
    if (senderRows.length === 0) throw new TransferError('Sender wallet authentication failed');
    const senderWallet = senderRows[0];
    const amount = parseFloat(tx.amount);

    if (parseFloat(senderWallet.balance) < amount) {
      // Mark as failed if balance became insufficient since initiation
      await connection.query(
        "UPDATE transactions SET status = 'failed', completed_at = NOW() WHERE transaction_id = ?",
        [transactionId]
      );
      await connection.commit();
      throw new TransferError('Current balance is insufficient for this transaction');
    }

    // 3. Lock receiver wallet (capture currency too for cross-currency conversion)
    const [receiverWalletRows] = await connection.query(
      'SELECT wallet_id, currency FROM wallets WHERE wallet_id = ? FOR UPDATE',
      [tx.receiver_wallet_id]
    );
    if (receiverWalletRows.length === 0) {
      throw new TransferError('Recipient wallet not found');
    }
    const receiverCurrency = receiverWalletRows[0].currency;
    const senderCurrency = senderWallet.currency;

    // If wallets are in different currencies, convert in-process via the
    // local currency service (FX brought in-house from the microservice).
    let receiverAmount = amount;
    if (senderCurrency && receiverCurrency && senderCurrency !== receiverCurrency) {
      try {
        receiverAmount = await convertCurrency(
          senderCurrency,
          receiverCurrency,
          amount,
        );
      } catch (err) {
        // Fail the transaction cleanly so it can be retried.
        await connection.query(
          "UPDATE transactions SET status = 'failed', completed_at = NOW() WHERE transaction_id = ?",
          [transactionId]
        );
        await connection.commit();
        throw new TransferError(
          `Currency conversion failed: ${err.message}`,
        );
      }
    }

    // 4. Debit sender (in sender's currency)
    await connection.query(
      'UPDATE wallets SET balance = balance - ? WHERE wallet_id = ?',
      [amount, tx.sender_wallet_id]
    );

    // 5. Credit receiver (in receiver's currency — possibly converted)
    await connection.query(
      'UPDATE wallets SET balance = balance + ? WHERE wallet_id = ?',
      [receiverAmount, tx.receiver_wallet_id]
    );

    // 6. Complete transaction record. Stamp final amounts/currencies for both sides
    //    so history can be rendered correctly per direction.
    await connection.query(
      `UPDATE transactions
         SET status = 'completed',
             completed_at = NOW(),
             amount_sent = ?,
             amount_received = ?,
             currency_sent = ?,
             currency_received = ?
       WHERE transaction_id = ?`,
      [amount, receiverAmount, senderCurrency, receiverCurrency, transactionId],
    );

    await connection.commit();

    // Fetch final details to return
    return await getFormattedTransaction(transactionId);
  } catch (err) {
    await connection.rollback();
    console.error('[executeTransfer] Transaction rolled back:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}

// Get full transaction details for the UI
async function getFormattedTransaction(transactionId) {
  const [rows] = await pool.query(
    `SELECT t.*, 
            us.first_name as s_first, us.last_name as s_last, us.phone as s_phone,
            ur.first_name as r_first, ur.last_name as r_last, ur.phone as r_phone
     FROM transactions t
     LEFT JOIN wallets ws ON t.sender_wallet_id = ws.wallet_id
     LEFT JOIN users us ON ws.user_id = us.user_id
     LEFT JOIN wallets wr ON t.receiver_wallet_id = wr.wallet_id
     LEFT JOIN users ur ON wr.user_id = ur.user_id
     WHERE t.transaction_id = ?`,
    [transactionId]
  );

  if (rows.length === 0) return null;
  const tx = rows[0];

  return {
    transactionId: tx.transaction_id,
    amount: parseFloat(tx.amount),
    type: tx.transaction_type,
    status: tx.status,
    referenceCode: tx.reference_code,
    description: tx.description,
    sender: {
      name: tx.s_first ? `${tx.s_first} ${tx.s_last}` : 'Unknown',
      phone: tx.s_phone ? maskPhone(tx.s_phone) : '****',
    },
    receiver: {
      name: tx.r_first ? `${tx.r_first} ${tx.r_last}` : 'Unknown',
      phone: tx.r_phone ? maskPhone(tx.r_phone) : '****',
    },
    createdAt: tx.created_at,
    completedAt: tx.completed_at,
  };
}

// Get history for the logged-in user
export async function getTransactionHistory(userId, limit = 20, offset = 0) {
  // First find the user's wallet_id
  const [wRows] = await pool.query('SELECT wallet_id FROM wallets WHERE user_id = ?', [userId]);
  if (wRows.length === 0) return [];
  const walletId = wRows[0].wallet_id;

  const [txRows] = await pool.query(
    `SELECT t.transaction_id, t.amount, t.amount_sent, t.amount_received,
            t.currency_sent, t.currency_received,
            t.transaction_type, t.status, t.reference_code, t.description,
            t.created_at, t.completed_at,
            us.first_name as s_first, us.last_name as s_last, us.email as s_email,
            ws.currency as s_currency,
            ur.first_name as r_first, ur.last_name as r_last, ur.email as r_email,
            wr.currency as r_currency,
            CASE WHEN t.sender_wallet_id = ? THEN 'sent' ELSE 'received' END as direction
     FROM transactions t
     LEFT JOIN wallets ws ON t.sender_wallet_id = ws.wallet_id
     LEFT JOIN users us ON ws.user_id = us.user_id
     LEFT JOIN wallets wr ON t.receiver_wallet_id = wr.wallet_id
     LEFT JOIN users ur ON wr.user_id = ur.user_id
     WHERE t.sender_wallet_id = ? OR t.receiver_wallet_id = ?
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [walletId, walletId, walletId, parseInt(limit), parseInt(offset)]
  );

  return txRows.map((tx) => {
    // Fall back to the legacy single `amount` field if the new columns are NULL
    // on older rows that haven't been migrated yet.
    const sentAmount =
      tx.amount_sent != null ? parseFloat(tx.amount_sent) : parseFloat(tx.amount);
    const receivedAmount =
      tx.amount_received != null
        ? parseFloat(tx.amount_received)
        : parseFloat(tx.amount);
    const sentCurrency = tx.currency_sent || tx.s_currency || 'USD';
    const receivedCurrency = tx.currency_received || tx.r_currency || 'USD';

    // Pick the right pair to surface for the logged-in user's view.
    const isReceived = tx.direction === 'received';
    const displayAmount = isReceived ? receivedAmount : sentAmount;
    const displayCurrency = isReceived ? receivedCurrency : sentCurrency;

    return {
      transactionId: tx.transaction_id,
      // Direction-aware (what the logged-in user actually saw move)
      amount: displayAmount,
      currency: displayCurrency,
      // Both sides for screens that need them (e.g. transfer-result)
      amountSent: sentAmount,
      amountReceived: receivedAmount,
      currencySent: sentCurrency,
      currencyReceived: receivedCurrency,
      type: tx.transaction_type,
      status: tx.status,
      referenceCode: tx.reference_code,
      description: tx.description,
      direction: tx.direction,
      sender: {
        name: tx.s_first ? `${tx.s_first} ${tx.s_last}` : 'Unknown',
        email: tx.s_email || null,
      },
      receiver: {
        name: tx.r_first ? `${tx.r_first} ${tx.r_last}` : 'Unknown',
        email: tx.r_email || null,
      },
      createdAt: tx.created_at,
      completedAt: tx.completed_at,
    };
  });
}

// Check wallet balance + currency for a user.
export async function getSenderBalance(userId) {
  const [rows] = await pool.query(
    'SELECT balance, currency FROM wallets WHERE user_id = ?',
    [userId],
  );
  if (rows.length === 0) return { balance: 0, currency: 'USD' };
  return {
    balance: parseFloat(rows[0].balance),
    currency: rows[0].currency || 'USD',
  };
}

// Get receiver's ID (used for real-time notifications)
export async function getReceiverUserId(transactionId) {
  const [rows] = await pool.query(
    `SELECT w.user_id FROM transactions t
     JOIN wallets w ON t.receiver_wallet_id = w.wallet_id
     WHERE t.transaction_id = ?`,
    [transactionId]
  );
  return rows.length > 0 ? rows[0].user_id : null;
}




export class TransferError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'TransferError';
    this.statusCode = statusCode;
  }
}
