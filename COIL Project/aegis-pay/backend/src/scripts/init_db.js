import 'dotenv/config';
import pool from '../core/db/mysql.js';

async function initDB() {
  console.log('Starting Schema Initialization...');

  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(36) PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status ENUM('active', 'suspended', 'unverified') DEFAULT 'unverified',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
    ) ENGINE=InnoDB;`,
    
    `CREATE TABLE IF NOT EXISTS admins (
        admin_id VARCHAR(36) PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,
    
    `CREATE TABLE IF NOT EXISTS wallets (
        wallet_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE,
        balance DECIMAL(18,2) DEFAULT 0.00,
        currency VARCHAR(10) NULL,
        status ENUM('active', 'frozen') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,
    
    `CREATE TABLE IF NOT EXISTS auth_sessions (
        session_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        jwt_token TEXT NOT NULL,
        ip_address VARCHAR(45) NULL,
        device_info VARCHAR(255) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,
    
    `CREATE TABLE IF NOT EXISTS transactions (
        transaction_id VARCHAR(36) PRIMARY KEY,
        sender_wallet_id VARCHAR(36) NULL,
        receiver_wallet_id VARCHAR(36) NULL,
        reference_code VARCHAR(100) UNIQUE NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        amount_sent DECIMAL(18,2) NULL,
        amount_received DECIMAL(18,2) NULL,
        currency_sent VARCHAR(10) NULL,
        currency_received VARCHAR(10) NULL,
        transaction_type ENUM('transfer', 'deposit', 'withdrawal', 'qr_payment') NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        description TEXT NULL,
        otp_code VARCHAR(6) NULL,
        otp_expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (sender_wallet_id) REFERENCES wallets(wallet_id),
        FOREIGN KEY (receiver_wallet_id) REFERENCES wallets(wallet_id)
    ) ENGINE=InnoDB;`,
    
    `CREATE TABLE IF NOT EXISTS qr_payments (
        qr_id VARCHAR(36) PRIMARY KEY,
        wallet_id VARCHAR(36) NOT NULL,
        qr_data TEXT NOT NULL,
        amount DECIMAL(18,2) NULL,
        status ENUM('active', 'used', 'expired') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`
  ];

  for (let i = 0; i < queries.length; i++) {
    try {
      console.log(`Executing query ${i + 1}...`);
      await pool.query(queries[i]);
      console.log(`✅ Query ${i + 1} successful.`);
    } catch (err) {
      console.error(`❌ Error executing query ${i + 1}:`);
      console.error(err.message || err);
      process.exit(1);
    }
  }

  console.log('🎉 Schema initialized successfully!');
  process.exit(0);
}

initDB();
