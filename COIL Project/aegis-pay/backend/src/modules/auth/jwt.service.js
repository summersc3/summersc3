import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../../core/db/mysql.js';

const SECRET = process.env.JWT_SECRET;

export class JwtStorageService {
  /**
   * Generates a new JWT token for a given user payload.
   */
  static generateToken(payload, expiresIn = '1h') {
    const sessionId = crypto.randomUUID();
    const token = jwt.sign({ ...payload, jti: sessionId }, SECRET, { expiresIn });
    return { token, sessionId };
  }

  /**
   * Verifies the authenticity and validity of a token.
   * Checks the signature and database state to ensure it isn't revoked.
   */
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      
      const [rows] = await pool.query(
        `SELECT is_active FROM auth_sessions WHERE session_id = ?`,
        [decoded.jti]
      );
      
      if (rows.length === 0 || !rows[0].is_active) {
        throw new Error('Token has been revoked or logged out');
      }
      
      return decoded;
    } catch (error) {
      throw new Error(error.message || 'Invalid or expired token');
    }
  }

  /**
   * Store token in the database when a user logs in.
   */
  static async storeToken(userId, tokenObj) {
    // Decode mathematically so we don't assume the expiration formatting
    const decoded = jwt.decode(tokenObj.token);
    const expiresAt = new Date(decoded.exp * 1000);

    await pool.query(
      `INSERT INTO auth_sessions (session_id, user_id, jwt_token, expires_at) VALUES (?, ?, ?, ?)`,
      [tokenObj.sessionId, userId, tokenObj.token, expiresAt]
    );
    
    console.log(`[JwtStorageService] Stored active session for user ${userId}`);
    return tokenObj.sessionId;
  }

  /**
   * Revokes a token (e.g. on logout) by setting is_active = FALSE.
   */
  static async revokeToken(token) {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti) return false;

    await pool.query(
      `UPDATE auth_sessions SET is_active = FALSE WHERE session_id = ?`,
      [decoded.jti]
    );
    
    console.log('[JwtStorageService] Revoked session successfully');
    return true;
  }
}
