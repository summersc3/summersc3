import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';
import { askAI } from '../../core/services/ai.service.js';

const router = Router();

// Light rate-limit so a runaway client can't burn through the Gemini quota.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many AI requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(requireAuth);
router.use(aiLimiter);

// GET /api/ai/ask/:text  — same path-param shape the original microservice
// used, so the frontend's call style stays the same.
router.get('/ask/:text', async (req, res) => {
  try {
    const text = decodeURIComponent(req.params.text || '').trim();
    if (!text) {
      return res
        .status(400)
        .json({ success: false, error: 'text is required' });
    }
    const answer = await askAI(text);
    res.json({ success: true, summary: answer });
  } catch (err) {
    console.error('AI ask error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/ask  — alternative for longer questions that don't fit a URL.
router.post('/ask', async (req, res) => {
  try {
    const text = (req.body?.text || '').toString().trim();
    if (!text) {
      return res
        .status(400)
        .json({ success: false, error: 'text is required' });
    }
    const answer = await askAI(text);
    res.json({ success: true, summary: answer });
  } catch (err) {
    console.error('AI ask error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
