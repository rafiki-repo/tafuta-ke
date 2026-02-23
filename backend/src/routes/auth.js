import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import config from '../config/index.js';
import { success, error } from '../utils/response.js';
import { isValidKenyanPhone, isValidEmail, validateRequired } from '../utils/validation.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper: Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Create JWT token
function createToken(user, adminRole = null) {
  return jwt.sign(
    {
      userId: user.user_id,
      phone: user.phone,
      isAdmin: !!adminRole,
      adminRole,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiry }
  );
}

// Helper: Log auth event
async function logAuthEvent(eventType, data) {
  try {
    await pool.query(
      `INSERT INTO auth_logs (user_id, phone, email, event_type, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.userId || null,
        data.phone || null,
        data.email || null,
        eventType,
        data.ipAddress || null,
        data.userAgent || null,
        data.metadata || null,
      ]
    );
  } catch (err) {
    logger.error('Failed to log auth event', { error: err.message });
  }
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { full_name, phone, email, password, terms_version, privacy_version, marketing_sms_opt_in, marketing_email_opt_in } = req.body;

    // Validate required fields
    const missing = validateRequired(['full_name', 'phone', 'terms_version', 'privacy_version'], req.body);
    if (missing.length > 0) {
      return res.status(400).json(error(`Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR'));
    }

    // Validate phone format
    if (!isValidKenyanPhone(phone)) {
      return res.status(400).json(error('Invalid Kenyan phone number format. Use +254XXXXXXXXX', 'INVALID_PHONE'));
    }

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json(error('Invalid email format', 'INVALID_EMAIL'));
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE phone = $1 OR (email = $2 AND email IS NOT NULL)',
      [phone, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json(error('User with this phone or email already exists', 'USER_EXISTS'));
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Create user
    const result = await pool.query(
      `INSERT INTO users (full_name, phone, email, password_hash, terms_version, terms_accepted_at, 
        privacy_version, privacy_accepted_at, marketing_sms_opt_in, marketing_email_opt_in)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), $7, $8)
       RETURNING user_id, full_name, phone, email, verification_tier, status, created_at`,
      [full_name, phone, email, passwordHash, terms_version, privacy_version, 
       marketing_sms_opt_in || false, marketing_email_opt_in || false]
    );

    const user = result.rows[0];

    // Log event
    await logAuthEvent('account_created', {
      userId: user.user_id,
      phone,
      email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Generate OTP for phone verification
    const otp = generateOTP();
    
    // TODO: Send OTP via VintEx SMS
    logger.info('OTP generated for phone verification', { phone, otp });

    res.status(201).json(success({
      user_id: user.user_id,
      full_name: user.full_name,
      phone: user.phone,
      verification_tier: user.verification_tier,
      status: user.status,
      message: 'Account created. Please verify your phone number.',
    }, 'User registered successfully'));

  } catch (err) {
    next(err);
  }
});

// POST /api/auth/request-otp
router.post('/request-otp', otpLimiter, async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !isValidKenyanPhone(phone)) {
      return res.status(400).json(error('Valid Kenyan phone number required', 'INVALID_PHONE'));
    }

    // Check if user exists
    const result = await pool.query('SELECT user_id, status FROM users WHERE phone = $1', [phone]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('User not found', 'USER_NOT_FOUND'));
    }

    const user = result.rows[0];

    if (user.status === 'deleted') {
      return res.status(403).json(error('Account has been deleted', 'ACCOUNT_DELETED'));
    }

    if (user.status === 'suspended') {
      return res.status(403).json(error('Account is suspended', 'ACCOUNT_SUSPENDED'));
    }

    // Generate OTP
    const otp = generateOTP();

    // TODO: Send OTP via VintEx SMS
    logger.info('OTP generated for login', { phone, otp });

    // Log event
    await logAuthEvent('otp_requested', {
      userId: user.user_id,
      phone,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(success({ message: 'OTP sent to your phone' }));

  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json(error('Phone and OTP required', 'VALIDATION_ERROR'));
    }

    // TODO: Verify OTP (currently accepting any 6-digit code for development)
    if (!/^\d{6}$/.test(otp)) {
      await logAuthEvent('otp_failed', {
        phone,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.status(400).json(error('Invalid OTP format', 'INVALID_OTP'));
    }

    // Get user
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone, u.email, u.verification_tier, u.status,
              a.role as admin_role
       FROM users u
       LEFT JOIN admin_users a ON u.user_id = a.user_id AND a.is_active = true
       WHERE u.phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('User not found', 'USER_NOT_FOUND'));
    }

    const user = result.rows[0];

    // Update phone verification and last login
    await pool.query(
      'UPDATE users SET phone_verified = true, last_login_at = NOW(), verification_tier = $1 WHERE user_id = $2',
      [user.verification_tier === 'unverified' ? 'basic' : user.verification_tier, user.user_id]
    );

    // Create JWT token
    const token = createToken(user, user.admin_role);

    // Store token in session
    req.session.token = token;
    req.session.userId = user.user_id;

    // Log event
    await logAuthEvent('login_success', {
      userId: user.user_id,
      phone,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(success({
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        verification_tier: user.verification_tier,
        is_admin: !!user.admin_role,
        admin_role: user.admin_role,
      },
    }, 'Login successful'));

  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json(error('Phone and password required', 'VALIDATION_ERROR'));
    }

    // Get user with password hash
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone, u.email, u.password_hash, u.verification_tier, u.status,
              a.role as admin_role
       FROM users u
       LEFT JOIN admin_users a ON u.user_id = a.user_id AND a.is_active = true
       WHERE u.phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      await logAuthEvent('login_failed', {
        phone,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { reason: 'user_not_found' },
      });
      return res.status(401).json(error('Invalid phone or password', 'INVALID_CREDENTIALS'));
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(400).json(error('Password login not enabled. Use OTP login.', 'PASSWORD_NOT_SET'));
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      await logAuthEvent('login_failed', {
        userId: user.user_id,
        phone,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { reason: 'invalid_password' },
      });
      return res.status(401).json(error('Invalid phone or password', 'INVALID_CREDENTIALS'));
    }

    // Check account status
    if (user.status === 'deleted') {
      return res.status(403).json(error('Account has been deleted', 'ACCOUNT_DELETED'));
    }

    if (user.status === 'suspended') {
      return res.status(403).json(error('Account is suspended', 'ACCOUNT_SUSPENDED'));
    }

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [user.user_id]);

    // Create JWT token
    const token = createToken(user, user.admin_role);

    // Store token in session
    req.session.token = token;
    req.session.userId = user.user_id;

    // Log event
    await logAuthEvent('login_success', {
      userId: user.user_id,
      phone,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(success({
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        verification_tier: user.verification_tier,
        is_admin: !!user.admin_role,
        admin_role: user.admin_role,
      },
    }, 'Login successful'));

  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const userId = req.session?.userId;

    if (userId) {
      await logAuthEvent('logout', {
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction failed', { error: err.message });
      }
    });

    res.json(success({ message: 'Logged out successfully' }));

  } catch (err) {
    next(err);
  }
});

export default router;
