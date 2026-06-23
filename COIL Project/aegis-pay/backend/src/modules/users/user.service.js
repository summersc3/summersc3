import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from '../../core/db/mysql.js';
import { JwtStorageService } from '../auth/jwt.service.js';

export class UserService {
  static async registerUser(payload) {
    let { first_name, last_name, phone, email, password } = payload;

    // 1. Validate Input
    if (!first_name || !last_name || !phone || !email || !password) {
      throw new Error('All fields are required');
    }

    // Hash Pass & Prepare User UUID (CPU-intensive work outside the DB transaction)
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // Normalize and validate phone in E.164 format.
    // Frontend is responsible for prepending the country code (e.g. +1, +84).
    // We strip common formatting characters then verify shape.
    phone = String(phone).replace(/[\s\-().]/g, '');
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      throw new Error('Invalid phone number. Include country code (e.g. +15551234567 for US, +84981234567 for Vietnam).');
    }

    // Formally test mathematical structural bounds
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
       throw new Error('Invalid email configuration securely blocked.');
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 2. Check for existing user
      const [existing] = await connection.query(
        'SELECT email, phone FROM users WHERE email = ? OR phone = ?',
        [email, phone]
      );
      if (existing.length > 0) {
        throw new Error('User with this email or phone already exists');
      }

      // 3. Insert User (userId and passwordHash already prepared)
      await connection.query(
        `INSERT INTO users (user_id, first_name, last_name, phone, email, password_hash, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [userId, first_name, last_name, phone, email, passwordHash]
      );

      // 5. Insert wallet with country-derived currency.
      // +84 → VND, +1 → USD, else → USD by default.
      const walletId = crypto.randomUUID();
      const walletCurrency = phone.startsWith('+84')
        ? 'VND'
        : phone.startsWith('+1')
          ? 'USD'
          : 'USD';
      await connection.query(
        `INSERT INTO wallets (wallet_id, user_id, balance, currency, status)
         VALUES (?, ?, 0.00, ?, 'active')`,
        [walletId, userId, walletCurrency]
      );

      // Successfully execute
      await connection.commit();

      // 6. Generate and Store Initial Login JWT
      const tokenPayload = { userId, email, role: 'user' };
      const token = JwtStorageService.generateToken(tokenPayload);
      await JwtStorageService.storeToken(userId, token);

      return {
        user: { id: userId, first_name, last_name, email, phone },
        wallet: { id: walletId, balance: 0.00, currency: walletCurrency },
        token: token.token
      };

    } catch (error) {
      // If ANY query fails, revert everything
      await connection.rollback();
      throw error;
    } finally {
      // Free the connection back to the Aiven DB Pool
      connection.release();
    }
  }

  /**
   * Fetches a user by their user_id from the database securely.
   */
  static async getUserById(userId) {
    const [rows] = await pool.query(
      'SELECT user_id as id, first_name, last_name, phone, email, status, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }
}
