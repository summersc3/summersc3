import { JwtStorageService } from '../../modules/auth/jwt.service.js';

/**
 * Express Middleware that intercepts incoming requests, extracts the JWT Bearer string,
 * validates the crypto-signature securely, cross-checks the session internally with our
 * Aiven MySQL nodes, and binds the raw user payloads securely into Express for local usage!
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Check if header exists and is natively formatted to standard JWT boundaries
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access denied: Authentication Bearer token string is required' 
      });
    }

    // Split the literal `Bearer <token>` payload
    const token = authHeader.split(' ')[1];
    
    // Verify mathematical bounds natively against Database parameters using our class wrapper
    const decodedPayload = await JwtStorageService.verifyToken(token);
    
    // Bind authenticated persona identically to the active memory sequence context
    req.user = decodedPayload;
    req.token = token;
    
    // Secure! Pass control natively to the requested router!
    next();
  } catch (error) {
    console.error('[Auth Middleware] Unauthorized rejection caught:', error.message);
    res.status(401).json({ 
      success: false, 
      error: error.message || 'Access denied: Invalid, revoked, or fully expired token chain' 
    });
  }
};
