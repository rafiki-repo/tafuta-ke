import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import pool from '../config/database.js';
import config from '../config/index.js';
import { success, error } from '../utils/response.js';
import { isValidKenyanPhone, isValidEmail, validateRequired } from '../utils/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.js';
import logger from '../utils/logger.js';
import { sendOtpEmail } from '../services/emailService.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function createToken(user, adminRole = null) {
  return jwt.sign(
    {
      userId:    user.user_id,
      phone:     user.phone  || null,
      email:     user.email  || null,
      isAdmin:   !!adminRole,
      adminRole,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiry }
  );
}

async function logAuthEvent(eventType, data) {
  try {
    await pool.query(
      `INSERT INTO auth_logs (user_id, phone, email, event_type, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.userId    || null,
        data.phone     || null,
        data.email     || null,
        eventType,
        data.ipAddress || null,
        data.userAgent || null,
        data.metadata  || null,
      ]
    );
  } catch (err) {
    logger.error('Failed to log auth event', { error: err.message });
  }
}

/**
 * Detect whether an identifier is an email or a phone number.
 * Returns { isEmail, isPhone }.
 */
function detectIdentifierType(identifier) {
  const isEmail = typeof identifier === 'string' && identifier.includes('@');
  return { isEmail, isPhone: !isEmail };
}

/**
 * Look up a user by phone or email (whichever applies to the identifier).
 * Includes admin_role join. Returns the row or null.
 */
async function findUserByIdentifier(identifier) {
  const { isEmail } = detectIdentifierType(identifier);
  const column = isEmail ? 'u.email' : 'u.phone';
  const result = await pool.query(
    `SELECT u.user_id, u.full_name, u.phone, u.email, u.password_hash,
            u.verification_tier, u.status,
            a.role as admin_role
     FROM users u
     LEFT JOIN admin_users a ON u.user_id = a.user_id AND a.is_active = true
     WHERE ${column} = $1`,
    [identifier]
  );
  return result.rows[0] || null;
}

/**
 * Store an OTP in otp_sessions. Returns the plaintext OTP.
 */
async function storeOtp(identifier) {
  const otp = generateOTP();
  const hash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await pool.query(
    `INSERT INTO otp_sessions (identifier, otp_hash, expires_at) VALUES ($1, $2, $3)`,
    [identifier, hash, expiresAt]
  );

  return otp;
}

/**
 * Verify an OTP against otp_sessions.
 * Returns { valid: true } or { valid: false, reason }.
 * Marks session as used on success; increments attempts on failure.
 */
async function verifyStoredOtp(identifier, otp) {
  const result = await pool.query(
    `SELECT id, otp_hash, attempts
     FROM otp_sessions
     WHERE identifier = $1
       AND expires_at > NOW()
       AND used = FALSE
     ORDER BY created_at DESC
     LIMIT 1`,
    [identifier]
  );

  if (result.rows.length === 0) {
    return { valid: false, reason: 'no_active_session' };
  }

  const session = result.rows[0];

  if (session.attempts >= 5) {
    return { valid: false, reason: 'max_attempts' };
  }

  if (session.otp_hash !== hashOtp(otp)) {
    await pool.query(
      `UPDATE otp_sessions SET attempts = attempts + 1 WHERE id = $1`,
      [session.id]
    );
    return { valid: false, reason: 'invalid_otp' };
  }

  await pool.query(
    `UPDATE otp_sessions SET used = TRUE WHERE id = $1`,
    [session.id]
  );

  return { valid: true };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const {
      full_name, phone, email, password,
      terms_version, privacy_version,
      marketing_sms_opt_in, marketing_email_opt_in,
    } = req.body;

    const missing = validateRequired(['full_name', 'phone', 'terms_version', 'privacy_version'], req.body);
    if (missing.length > 0) {
      return res.status(400).json(error(`Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR'));
    }

    if (!isValidKenyanPhone(phone)) {
      return res.status(400).json(error('Invalid Kenyan phone number format. Use +254XXXXXXXXX', 'INVALID_PHONE'));
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json(error('Invalid email format', 'INVALID_EMAIL'));
    }

    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE phone = $1 OR (email = $2 AND email IS NOT NULL)',
      [phone, email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json(error('User with this phone or email already exists', 'USER_EXISTS'));
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `INSERT INTO users (full_name, phone, email, password_hash, terms_version, terms_accepted_at,
        privacy_version, privacy_accepted_at, marketing_sms_opt_in, marketing_email_opt_in)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), $7, $8)
       RETURNING user_id, full_name, phone, email, verification_tier, status, created_at`,
      [full_name, phone, email, passwordHash, terms_version, privacy_version,
       marketing_sms_opt_in || false, marketing_email_opt_in || false]
    );

    const user = result.rows[0];

    await logAuthEvent('account_created', {
      userId: user.user_id, phone, email,
      ipAddress: req.ip, userAgent: req.get('user-agent'),
    });

    // Generate and store OTP for phone verification
    const otp = await storeOtp(phone);

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

// ---------------------------------------------------------------------------
// POST /api/auth/request-otp
// ---------------------------------------------------------------------------

router.post('/request-otp', otpLimiter, async (req, res, next) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json(error('Phone number or email is required', 'VALIDATION_ERROR'));
    }

    const { isEmail } = detectIdentifierType(identifier);

    if (isEmail) {
      if (!isValidEmail(identifier)) {
        return res.status(400).json(error('Invalid email address', 'INVALID_EMAIL'));
      }
    } else {
      if (!isValidKenyanPhone(identifier)) {
        return res.status(400).json(error('Invalid Kenyan phone number format. Use +254XXXXXXXXX', 'INVALID_PHONE'));
      }
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(404).json(error('No account found with that phone or email', 'USER_NOT_FOUND'));
    }

    if (user.status === 'deleted') {
      return res.status(403).json(error('Account has been deleted', 'ACCOUNT_DELETED'));
    }
    if (user.status === 'suspended') {
      return res.status(403).json(error('Account is suspended', 'ACCOUNT_SUSPENDED'));
    }

    const otp = await storeOtp(identifier);

    if (isEmail) {
      await sendOtpEmail(identifier, otp);
    } else {
      // TODO: Send OTP via VintEx SMS
      logger.info('OTP generated for login', { identifier, otp });
    }

    await logAuthEvent('otp_requested', {
      userId: user.user_id,
      phone:  isEmail ? null : identifier,
      email:  isEmail ? identifier : null,
      ipAddress: req.ip, userAgent: req.get('user-agent'),
    });

    const channel = isEmail ? 'email' : 'phone';
    res.json(success({ message: `OTP sent to your ${channel}`, channel }));

  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-otp
// ---------------------------------------------------------------------------

router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json(error('Identifier and OTP are required', 'VALIDATION_ERROR'));
    }

    const bdOtp = config.auth?.bdOtp;
    const isBackdoorOtp = typeof bdOtp === 'string' && bdOtp.length > 0 && otp === bdOtp;
    const isDevelopment = config.env === 'development';

    if (!isBackdoorOtp) {
      if (isDevelopment) {
        // Dev fallback: accept any 6-digit code so testers are never blocked
        if (!/^\d{6}$/.test(otp)) {
          await logAuthEvent('otp_failed', {
            phone: identifier, ipAddress: req.ip, userAgent: req.get('user-agent'),
          });
          return res.status(400).json(error('Invalid OTP format', 'INVALID_OTP'));
        }
      } else {
        // Production: verify against otp_sessions
        const verification = await verifyStoredOtp(identifier, otp);
        if (!verification.valid) {
          const { isEmail } = detectIdentifierType(identifier);
          await logAuthEvent('otp_failed', {
            phone: isEmail ? null : identifier,
            email: isEmail ? identifier : null,
            ipAddress: req.ip, userAgent: req.get('user-agent'),
            metadata: { reason: verification.reason },
          });
          const msg = verification.reason === 'max_attempts'
            ? 'Too many failed attempts. Please request a new OTP.'
            : 'Invalid or expired OTP.';
          return res.status(400).json(error(msg, 'INVALID_OTP'));
        }
      }
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(404).json(error('User not found', 'USER_NOT_FOUND'));
    }

    if (user.status === 'deleted') {
      return res.status(403).json(error('Account has been deleted', 'ACCOUNT_DELETED'));
    }
    if (user.status === 'suspended') {
      return res.status(403).json(error('Account is suspended', 'ACCOUNT_SUSPENDED'));
    }

    const { isEmail } = detectIdentifierType(identifier);

    // Mark phone or email as verified; upgrade tier if still unverified
    if (isEmail) {
      await pool.query(
        `UPDATE users SET email_verified = true, last_login_at = NOW(),
         verification_tier = CASE WHEN verification_tier = 'unverified' THEN 'basic' ELSE verification_tier END
         WHERE user_id = $1`,
        [user.user_id]
      );
    } else {
      await pool.query(
        `UPDATE users SET phone_verified = true, last_login_at = NOW(),
         verification_tier = CASE WHEN verification_tier = 'unverified' THEN 'basic' ELSE verification_tier END
         WHERE user_id = $1`,
        [user.user_id]
      );
    }

    const token = createToken(user, user.admin_role);
    req.session.token = token;
    req.session.userId = user.user_id;

    await logAuthEvent('login_success', {
      userId: user.user_id,
      phone:  isEmail ? null : identifier,
      email:  isEmail ? identifier : null,
      ipAddress: req.ip, userAgent: req.get('user-agent'),
      metadata: isBackdoorOtp
        ? { otp_method: 'bd_otp' }
        : isDevelopment
          ? { otp_method: 'dev_any_6_digit' }
          : { otp_method: isEmail ? 'email_otp' : 'sms_otp' },
    });

    res.json(success({
      token,
      user: {
        user_id:           user.user_id,
        full_name:         user.full_name,
        phone:             user.phone,
        email:             user.email,
        verification_tier: user.verification_tier,
        is_admin:          !!user.admin_role,
        admin_role:        user.admin_role,
      },
    }, 'Login successful'));

  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login  (password-based)
// ---------------------------------------------------------------------------

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json(error('Identifier and password are required', 'VALIDATION_ERROR'));
    }

    const user = await findUserByIdentifier(identifier);
    const { isEmail } = detectIdentifierType(identifier);

    if (!user) {
      await logAuthEvent('login_failed', {
        phone: isEmail ? null : identifier,
        email: isEmail ? identifier : null,
        ipAddress: req.ip, userAgent: req.get('user-agent'),
        metadata: { reason: 'user_not_found' },
      });
      return res.status(401).json(error('Invalid credentials', 'INVALID_CREDENTIALS'));
    }

    if (!user.password_hash) {
      return res.status(400).json(error('Password login not enabled for this account. Use OTP login.', 'PASSWORD_NOT_SET'));
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      await logAuthEvent('login_failed', {
        userId: user.user_id,
        phone:  isEmail ? null : identifier,
        email:  isEmail ? identifier : null,
        ipAddress: req.ip, userAgent: req.get('user-agent'),
        metadata: { reason: 'invalid_password' },
      });
      return res.status(401).json(error('Invalid credentials', 'INVALID_CREDENTIALS'));
    }

    if (user.status === 'deleted') {
      return res.status(403).json(error('Account has been deleted', 'ACCOUNT_DELETED'));
    }
    if (user.status === 'suspended') {
      return res.status(403).json(error('Account is suspended', 'ACCOUNT_SUSPENDED'));
    }

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [user.user_id]);

    const token = createToken(user, user.admin_role);
    req.session.token = token;
    req.session.userId = user.user_id;

    await logAuthEvent('login_success', {
      userId: user.user_id,
      phone:  isEmail ? null : identifier,
      email:  isEmail ? identifier : null,
      ipAddress: req.ip, userAgent: req.get('user-agent'),
    });

    res.json(success({
      token,
      user: {
        user_id:           user.user_id,
        full_name:         user.full_name,
        phone:             user.phone,
        email:             user.email,
        verification_tier: user.verification_tier,
        is_admin:          !!user.admin_role,
        admin_role:        user.admin_role,
      },
    }, 'Login successful'));

  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/google  — initiate Google OAuth
// ---------------------------------------------------------------------------

router.get('/google', (req, res, next) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    return res.status(503).json(error('Google OAuth is not configured on this server', 'OAUTH_NOT_CONFIGURED'));
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

// ---------------------------------------------------------------------------
// GET /api/auth/google/callback  — handle Google OAuth callback
// ---------------------------------------------------------------------------

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${config.appUrl}/login?error=google_failed` }),
  async (req, res, next) => {
    try {
      const profile = req.user; // set by passport verify callback
      const googleId = profile.id;
      const googleEmail = profile.emails?.[0]?.value;
      const displayName = profile.displayName || '';

      if (!googleEmail) {
        return res.redirect(`${config.appUrl}/login?error=google_no_email`);
      }

      let user = null;
      let isNewUser = false;

      // 1. Look up by google_id
      const byGoogleId = await pool.query(
        `SELECT u.user_id, u.full_name, u.phone, u.email, u.verification_tier, u.status,
                a.role as admin_role
         FROM users u
         LEFT JOIN admin_users a ON u.user_id = a.user_id AND a.is_active = true
         WHERE u.google_id = $1`,
        [googleId]
      );
      if (byGoogleId.rows.length > 0) {
        user = byGoogleId.rows[0];
      }

      // 2. Look up by email (and save google_id if not yet stored)
      if (!user) {
        const byEmail = await pool.query(
          `SELECT u.user_id, u.full_name, u.phone, u.email, u.verification_tier, u.status,
                  a.role as admin_role
           FROM users u
           LEFT JOIN admin_users a ON u.user_id = a.user_id AND a.is_active = true
           WHERE u.email = $1`,
          [googleEmail]
        );
        if (byEmail.rows.length > 0) {
          user = byEmail.rows[0];
          // Attach google_id to existing account
          await pool.query(
            `UPDATE users SET google_id = $1 WHERE user_id = $2`,
            [googleId, user.user_id]
          );
        }
      }

      // 3. Create new account
      if (!user) {
        isNewUser = true;
        const newUser = await pool.query(
          `INSERT INTO users (full_name, email, google_id, verification_tier,
             terms_version, terms_accepted_at, privacy_version, privacy_accepted_at)
           VALUES ($1, $2, $3, 'basic', '1.0', NOW(), '1.0', NOW())
           RETURNING user_id, full_name, phone, email, verification_tier, status`,
          [displayName || googleEmail, googleEmail, googleId]
        );
        user = { ...newUser.rows[0], admin_role: null };

        await logAuthEvent('account_created', {
          userId: user.user_id, email: googleEmail,
          ipAddress: req.ip, userAgent: req.get('user-agent'),
          metadata: { method: 'google_oauth' },
        });
      }

      if (user.status === 'deleted' || user.status === 'suspended') {
        return res.redirect(`${config.appUrl}/login?error=account_${user.status}`);
      }

      await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [user.user_id]);

      const token = createToken(user, user.admin_role);
      req.session.token = token;
      req.session.userId = user.user_id;

      await logAuthEvent('login_success', {
        userId: user.user_id, email: googleEmail,
        ipAddress: req.ip, userAgent: req.get('user-agent'),
        metadata: { method: 'google_oauth' },
      });

      // Redirect to frontend with token; new=1 triggers the optional phone capture dialog
      const hasPhone = !!user.phone;
      const newFlag = isNewUser && !hasPhone ? '1' : '0';
      res.redirect(`${config.appUrl}/auth/google?token=${token}&new=${newFlag}`);

    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/auth/google/phone  — save phone after Google login (optional)
// ---------------------------------------------------------------------------

router.patch('/google/phone', requireAuth, async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json(error('Phone number is required', 'VALIDATION_ERROR'));
    }

    if (!isValidKenyanPhone(phone)) {
      return res.status(400).json(error('Invalid Kenyan phone number format. Use +254XXXXXXXXX', 'INVALID_PHONE'));
    }

    // Check uniqueness
    const existing = await pool.query(
      'SELECT user_id FROM users WHERE phone = $1 AND user_id != $2',
      [phone, req.user.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json(error('Phone number already in use by another account', 'PHONE_TAKEN'));
    }

    await pool.query(
      'UPDATE users SET phone = $1 WHERE user_id = $2',
      [phone, req.user.userId]
    );

    logger.info('Phone saved after Google login', { userId: req.user.userId });

    res.json(success({ phone }, 'Phone number saved'));

  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

router.post('/logout', async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    if (userId) {
      await logAuthEvent('logout', {
        userId, ipAddress: req.ip, userAgent: req.get('user-agent'),
      });
    }
    req.session.destroy((err) => {
      if (err) logger.error('Session destruction failed', { error: err.message });
    });
    res.json(success({ message: 'Logged out successfully' }));
  } catch (err) {
    next(err);
  }
});

export default router;
