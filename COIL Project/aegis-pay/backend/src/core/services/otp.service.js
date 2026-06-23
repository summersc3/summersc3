import twilio from 'twilio';
import pool from '../db/mysql.js';

// Boot Twilio safely utilizing natively mapped Environment chains
const twilioClient = process.env.TWILIO_ACCOUNT_SID 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export class OTPService {

  /**
   * Translates internal userId to a physical phone device and securely routes
   * a Twilio Verify V2 code inherently across distributed SMS nodes natively.
   */
  static async generateOTP(userId) {
    if (!twilioClient) {
        throw new Error('[OTPService] System Alert: Twilio credentials natively offline.');
    }

    // Map strict DB identity constraints
    const [userRows] = await pool.query('SELECT phone FROM users WHERE user_id = ?', [userId]);
    if (userRows.length === 0) {
        throw new Error('[System Guard] Critical Error: Failed to cleanly extract proper SMS mapped identity.');
    }
    
    const targetPhoneString = userRows[0].phone;
    
    // Natively bind sequence generation and dispatch over to Twilio AWS Clouds
    try {
        const verification = await twilioClient.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications
            .create({ to: targetPhoneString, channel: 'sms' });

        console.log(`[Twilio Verify] Outbound dispatched natively -> ${targetPhoneString} (Status: ${verification.status})`);
        
        return verification.sid;
    } catch (error) {
        throw new Error(`Twilio Dispatch Failure: ${error.message}`);
    }
  }

  /**
   * Defers structural database cross-referencing explicitly over to Twilio Verify Check engines natively.
   */
  static async verifyOTP(userId, otpCode) {
    if (!twilioClient) {
        throw new Error('[OTPService] System Alert: Twilio credentials natively offline.');
    }

    // Re-validate internal mappings guaranteeing routing restrictions accurately match the payload targets
    const [userRows] = await pool.query('SELECT phone FROM users WHERE user_id = ?', [userId]);
    if (userRows.length === 0) {
        throw new Error('[System Guard] Critical Error: Failed to natively resolve target SMS bindings.');
    }

    const targetPhoneString = userRows[0].phone;

    try {
      // Execute live remote validation sequence evaluating code integrity mathematically against Twilio targets
      const verificationCheck = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks
        .create({ to: targetPhoneString, code: otpCode });

      if (verificationCheck.status !== 'approved') {
        throw new Error('Invalid authentication string sequence natively rejected. Please try again.');
      }

      console.log(`[Twilio Verify] Success! Payload hook cleanly matched for User: ${userId}.`);
      return true;
      
    } catch (error) {
      throw new Error(`[Twilio Verify] Verification inherently failed: ${error.message}`);
    }
  }
}
