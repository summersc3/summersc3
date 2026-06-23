import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import pool from '../../core/db/mysql.js';
import { JwtStorageService } from './jwt.service.js';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';
import { UserService } from '../users/user.service.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for dev debugging to prevent lockout
  message: { success: false, error: 'Too many login attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Login Endpoint
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // 1. Fetch user from DB
    const [users] = await pool.query(
      'SELECT user_id, email, password_hash, status, first_name, last_name, phone FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const account = users[0];

    // 2. Verify account status
    if (account.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Account suspended' });
    }

    // 3. Verify password securely
    const isPasswordValid = await bcrypt.compare(password, account.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // 4. Update last_login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [account.user_id]);

    // 5. Generate and physically store active JWT
    const tokenPayload = { userId: account.user_id, email: account.email };
    const tokenObj = JwtStorageService.generateToken(tokenPayload);
    await JwtStorageService.storeToken(account.user_id, tokenObj);

    // 6. Fetch full profile securely for frontend visibility
    const userProfile = await UserService.getUserById(account.user_id);

    res.json({ 
      success: true, 
      message: 'Login successful',
      token: tokenObj.token,
      user: userProfile
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error processing login' });
  }
});

// Profile Endpoint
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await UserService.getUserById(req.user.userId);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve profile data' });
  }
});

// Logout Endpoint
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Revoke the token structurally inside the SQL database
    await JwtStorageService.revokeToken(req.token);
    
    res.json({ success: true, message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: error.message || 'Logout sequence failed' });
  }
});



export default router;
