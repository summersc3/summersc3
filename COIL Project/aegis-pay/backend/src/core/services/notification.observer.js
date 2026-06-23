import { EventEmitter } from 'events';
import { getIo } from '../sockets/index.js';

class NotificationObserver extends EventEmitter {
  constructor() {
    super();
    this._attachListeners();
  }

  _attachListeners() {
    // ---------------------------------------------------------
    // 1. Transaction Complete Hook (Live WebSocket Push)
    // ---------------------------------------------------------
    this.on('transaction.completed', (data) => {
      // expected payload -> { userId, title, message, metadata }
      try {
        const io = getIo();
        const roomName = `user_${data.userId}`;
        
        // Dispatch physically connected instances straight into the React Native device dynamically!
        io.to(roomName).emit('notification', {
          title: data.title,
          body: data.message,
          metadata: data.metadata || {},
          timestamp: new Date().toISOString()
        });
        
        console.log(`[Observer Engine] Hook successfully deployed natively -> ${roomName}`);
      } catch (e) {
        console.warn('[Observer Engine] Live push architecture internally offline:', e.message);
      }
    });

    // ---------------------------------------------------------
    // 2. Generic User Initialization Flow (Emails)
    // ---------------------------------------------------------
    this.on('user.registered', (data) => {
      // Mocked out natively until a third-party Email carrier configures
      console.log(`[Observer Engine] MOCKED EMAIL DISPATCH // Sending Official Welcome Guide -> ${data.email}`);
    });
  }
}

// Export a globally instanced Singleton natively!
export const notificationEmitter = new NotificationObserver();
