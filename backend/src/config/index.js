import dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  auth: {
    bdOtp: (process.env.BD_OTP || '').trim(),
  },
  
  database: {
    url: process.env.DATABASE_URL,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '60m',
  },
  
  session: {
    secret: process.env.SESSION_SECRET,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  pesapal: {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY,
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
    callbackUrl: process.env.PESAPAL_CALLBACK_URL,
    ipnUrl: process.env.PESAPAL_IPN_URL,
    env: process.env.PESAPAL_ENV || 'sandbox',
  },
  
  vintex: {
    apiKey: process.env.VINTEX_API_KEY,
    senderId: process.env.VINTEX_SENDER_ID || 'TAFUTA',
  },
  
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  },
  
  cloudflare: {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
  },
  
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 2097152, // 2MB
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
};

export default config;
