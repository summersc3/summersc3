import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';
import {
  lookupRecipient,
  initiateTransfer,
  executeTransfer,
  getTransactionHistory,
  getReceiverUserId,
  getSenderBalance,
  TransferError,
} from './transfer.service.js';
import { convertCurrency } from '../../core/services/currency.service.js';

const router = Router();

const transferLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 transfer initiations per hour
  message: { success: false, error: 'Too many transfer attempts. Please wait an hour before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All transfer routes require authentication
router.use(requireAuth);

// Find a recipient by phone or email
router.post('/lookup', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'identifier (phone or email) is required' });
    }

    const recipient = await lookupRecipient(identifier);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    if (recipient.userId === req.user.userId) {
      return res.status(400).json({ success: false, error: 'Cannot transfer to yourself' });
    }

    res.json({
      success: true,
      user: {
        name: `${recipient.firstName} ${recipient.lastName}`,
        maskedPhone: recipient.maskedPhone,
        maskedEmail: recipient.maskedEmail,
        phoneCountry: recipient.phoneCountry,
      },
    });
  } catch (err) {
    console.error('Lookup error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create a new transfer and generate OTP
router.post('/initiate', transferLimiter, async (req, res) => {
  try {
    const { receiverIdentifier, amount, description } = req.body;

    if (!receiverIdentifier) {
      return res.status(400).json({ success: false, error: 'receiverIdentifier is required' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    const transaction = await initiateTransfer(
      req.user.userId,
      receiverIdentifier,
      amount,
      description
    );

    res.json({
      success: true,
      transactionId: transaction.transactionId,
      referenceCode: transaction.referenceCode,
      amount: transaction.amount,
      receiver: transaction.receiver,
      otpSent: true,
    });
  } catch (err) {
    if (err instanceof TransferError) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    console.error('Initiate transfer error:', err);
    // TEMP DEBUG: surface real error message to the client so we can diagnose 500s.
    // Revert to generic 'Internal server error' once the issue is fixed.
    res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error',
      code: err?.code,
      sqlState: err?.sqlState,
    });
  }
});

// Verify OTP and finish the transfer
router.post('/verify-otp', async (req, res) => {
  try {
    const { transactionId, otpCode } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'transactionId is required' });
    }
    if (!otpCode) {
      return res.status(400).json({ success: false, error: 'otpCode is required' });
    }

    // Execute the transfer (includes OTP verification)
    const transaction = await executeTransfer(transactionId, req.user.userId, otpCode);

    // Emit Socket.IO event for real-time notification
    try {
      const { getIo } = await import('../../core/sockets/index.js');
      const io = getIo();
      const receiverUserId = await getReceiverUserId(transactionId);

      if (receiverUserId) {
        io.to(`user_${receiverUserId}`).emit('notification', {
          title: 'Money Received!',
          body: `You received $${transaction.amount.toLocaleString('en-US')} from ${transaction.sender.name}`,
          metadata: { transactionId, type: 'transfer_received' },
          timestamp: new Date().toISOString(),
        });
      }

      // Notify sender too
      io.to(`user_${req.user.userId}`).emit('notification', {
        title: 'Transfer Completed',
        body: `Transfer of $${transaction.amount.toLocaleString('en-US')} completed successfully`,
        metadata: { transactionId, type: 'transfer_completed' },
        timestamp: new Date().toISOString(),
      });
    } catch (socketErr) {
      console.warn('Socket notification skipped:', socketErr.message);
    }

    res.json({
      success: true,
      status: 'completed',
      transaction,
    });
  } catch (err) {
    if (err instanceof TransferError) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get transaction history for the user
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const transactions = await getTransactionHistory(req.user.userId, limit, offset);

    res.json({ success: true, transactions });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Currency conversion preview — used by the International Transfer screen
// to show "Recipient gets X" as the user types an amount.
router.post('/convert', async (req, res) => {
  try {
    const { senderCur, targetCur, amount } = req.body;
    if (!senderCur || !targetCur || typeof amount !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'senderCur, targetCur, and numeric amount are required',
      });
    }
    const result = await convertCurrency(senderCur, targetCur, amount);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Currency convert error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current user balance
router.get('/balance', async (req, res) => {
  try {
    const wallet = await getSenderBalance(req.user.userId);
    res.json({
      success: true,
      balance: wallet.balance,
      currency: wallet.currency || 'USD',
    });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
