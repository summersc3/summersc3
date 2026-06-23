import { Router } from 'express';
import { UserService } from './user.service.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const result = await UserService.registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    res.status(400).json({ success: false, error: error.message || 'Registration failed' });
  }
});

export default router;
