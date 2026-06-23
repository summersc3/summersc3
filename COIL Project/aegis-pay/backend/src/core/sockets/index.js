import { Server } from 'socket.io';
import { JwtStorageService } from '../../modules/auth/jwt.service.js';

let io;

export const initSockets = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Adjust safely moving natively towards Production
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Unauthenticated raw connection mapped: ${socket.id}`);
    
    // FrontEnd logic must physically transmit this manually utilizing active credentials to verify state!
    socket.on('authenticate', async (payload) => {
      try {
        if (!payload || !payload.token) {
           return socket.emit('auth_error', { error: 'Authentication payload structurally missing natively.' });
        }
        
        // Physically mathematically bounce against the Aiven Node engines to prevent stale/revoked JWT tokens from logging into sockets globally!
        const decoded = await JwtStorageService.verifyToken(payload.token);
        
        // Confirmed! Lock them intimately into their exact unique ID string mapping
        const roomName = `user_${decoded.userId}`;
        socket.join(roomName);
        
        // Push acceptance payload mapping directly to user structurally
        socket.emit('authenticated', { message: 'Security bounds cleared natively! Connecting live streaming sequences.' });
        console.log(`[Socket.io] Identity Formally Authorized: ${socket.id} safely tracking room [${roomName}]`);
        
      } catch (error) {
        console.warn(`[Socket.io] Authentication firmly rejected natively for ${socket.id}: ${error.message}`);
        socket.emit('auth_error', { error: 'Authentication mathematically failed across internal pipelines.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client inherently tracking disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io engines securely offline currently!');
  }
  return io;
};
