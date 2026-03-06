/**
 * emailService.js — Mailgun transactional email sending.
 *
 * Uses the Mailgun REST API directly via axios (no extra SDK needed).
 * Requires env vars: MAILGUN_API_KEY, MAILGUN_DOMAIN
 */

import axios from 'axios';
import FormData from 'form-data';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Send an OTP login code to an email address.
 * @param {string} to  - Recipient email address
 * @param {string} otp - 6-digit OTP code (plaintext, shown in email)
 */
export async function sendOtpEmail(to, otp) {
  const { apiKey, domain } = config.mailgun;

  if (!apiKey || !domain) {
    logger.warn('Mailgun not configured — OTP email not sent', { to });
    return;
  }

  const form = new FormData();
  form.append('from', `Tafuta <noreply@${domain}>`);
  form.append('to', to);
  form.append('subject', 'Your Tafuta login code');
  form.append(
    'text',
    `Your Tafuta login code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`
  );
  form.append(
    'html',
    `<p>Your Tafuta login code is:</p>
<h2 style="letter-spacing:0.2em">${otp}</h2>
<p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>`
  );

  try {
    await axios.post(
      `https://api.mailgun.net/v3/${domain}/messages`,
      form,
      {
        auth: { username: 'api', password: apiKey },
        headers: form.getHeaders(),
      }
    );
    logger.info('OTP email sent', { to });
  } catch (err) {
    logger.error('Failed to send OTP email', {
      to,
      status: err.response?.status,
      data: err.response?.data,
    });
    throw new Error('Failed to send OTP email');
  }
}
