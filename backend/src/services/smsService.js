/**
 * smsService.js - SMS sending with selectable providers.
 *
 * Set SMS_PROVIDER to galatext, vintex, or vintex_with_galatext_fallback.
 * Requires env vars: VINTEX_API_KEY, VINTEX_EMAIL
 * Optional env vars: VINTEX_SENDER_ID, VINTEX_BASE_URL
 * Requires Galatext env vars: GALATEXT_API_KEY
 * Optional Galatext env vars: GALATEXT_SENDER_ID, GALATEXT_BASE_URL, GALATEXT_TIMEOUT_MS
 */

import axios from 'axios';
import Galatext from 'galatext-api';
import config from '../config/index.js';
import logger from '../utils/logger.js';

function smsError(message, code = 'SMS_DELIVERY_FAILED', statusCode = 502) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

function isConfiguredValue(value) {
  return Boolean(value && !String(value).startsWith('your-'));
}

function toVintexRecipient(phone) {
  const compact = String(phone || '').replace(/[\s\-()]/g, '');

  if (compact.startsWith('+254')) {
    return `0${compact.slice(4)}`;
  }

  return compact.replace(/^\+/, '');
}

function toE164KenyanRecipient(phone) {
  const compact = String(phone || '').replace(/[\s\-()]/g, '');

  if (compact.startsWith('+254')) {
    return compact;
  }

  if (compact.startsWith('254')) {
    return `+${compact}`;
  }

  if (compact.startsWith('0')) {
    return `+254${compact.slice(1)}`;
  }

  return compact.startsWith('+') ? compact : `+${compact}`;
}

async function sendViaVintex({ recipients, message, campaignID, campaign_name }) {
  const { apiKey, email, senderId, baseUrl } = config.vintex;

  if (!isConfiguredValue(apiKey) || !isConfiguredValue(email)) {
    logger.warn('VintEx SMS not configured - SMS not sent', { recipients });
    throw smsError('SMS provider is not configured', 'SMS_NOT_CONFIGURED', 503);
  }

  const recipientList = Array.isArray(recipients) ? recipients : [recipients];
  const formattedRecipients = recipientList.map(toVintexRecipient).join(',');

  try {
    const response = await axios.post(
      `${baseUrl}/sendMessage`,
      {
        recipients: formattedRecipients,
        senderID: senderId,
        message,
        ...(campaignID ? { campaignID } : {}),
        ...(campaign_name ? { campaign_name } : {}),
      },
      {
        params: { email },
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const statusCode = response.data?.status?.code;
    if (String(statusCode) !== '2000') {
      logger.error('VintEx SMS rejected request', {
        recipients: formattedRecipients,
        status: response.status,
        data: response.data,
      });
      throw smsError(response.data?.message || 'SMS provider rejected request');
    }

    logger.info('SMS sent via VintEx', { recipients: formattedRecipients });
    return { provider: 'vintex', data: response.data };
  } catch (err) {
    logger.error('Failed to send SMS via VintEx', {
      recipients: formattedRecipients,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    if (err.code && err.statusCode) {
      throw err;
    }
    throw smsError('Failed to send SMS');
  }
}

async function sendViaGalatext({ recipients, message }) {
  const { apiKey, senderId, baseUrl, timeout } = config.galatext;

  if (!isConfiguredValue(apiKey)) {
    logger.warn('Galatext SMS not configured - SMS not sent', { recipients });
    throw smsError('Galatext SMS provider is not configured', 'SMS_GALATEXT_NOT_CONFIGURED', 503);
  }

  const recipientList = Array.isArray(recipients) ? recipients : [recipients];
  const formattedRecipients = recipientList.map(toE164KenyanRecipient);
  const client = new Galatext(apiKey, { baseURL: baseUrl, timeout });

  try {
    const response = formattedRecipients.length === 1
      ? await client.sms.send(formattedRecipients[0], message, senderId)
      : await client.sms.bulk(formattedRecipients, message, senderId);

    logger.info('SMS sent via Galatext', { recipients: formattedRecipients.join(',') });
    return { provider: 'galatext', data: response };
  } catch (err) {
    logger.error('Failed to send SMS via Galatext', {
      recipients: formattedRecipients.join(','),
      status: err.status,
      code: err.code,
      message: err.message,
    });
    if (err.code && err.statusCode) {
      throw err;
    }
    throw smsError(err.message || 'Failed to send SMS via fallback provider');
  }
}

async function sendSms({ recipients, message, campaignID, campaign_name }) {
  const provider = config.sms.provider;

  if (provider === 'galatext') {
    return sendViaGalatext({ recipients, message, campaignID, campaign_name });
  }

  if (provider === 'vintex') {
    return sendViaVintex({ recipients, message, campaignID, campaign_name });
  }

  if (provider !== 'vintex_with_galatext_fallback') {
    logger.warn('Unknown SMS_PROVIDER, using Galatext', { provider });
    return sendViaGalatext({ recipients, message, campaignID, campaign_name });
  }

  try {
    return await sendViaVintex({ recipients, message, campaignID, campaign_name });
  } catch (primaryErr) {
    logger.warn('Primary SMS provider failed; trying fallback provider', {
      code: primaryErr.code,
      message: primaryErr.message,
    });

    try {
      return await sendViaGalatext({ recipients, message, campaignID, campaign_name });
    } catch (fallbackErr) {
      logger.error('All SMS providers failed', {
        primary: { code: primaryErr.code, message: primaryErr.message },
        fallback: { code: fallbackErr.code, message: fallbackErr.message },
      });
      if (fallbackErr.code === 'SMS_GALATEXT_NOT_CONFIGURED') {
        throw primaryErr;
      }
      throw fallbackErr;
    }
  }
}

export async function sendOtpSms(phone, otp) {
  return sendSms({
    recipients: phone,
    message: `Your Tafuta verification code is ${otp}. It expires in 10 minutes. Do not share it with anyone.`,
    campaign_name: 'Tafuta OTP',
  });
}
