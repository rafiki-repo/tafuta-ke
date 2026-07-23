/**
 * smsService.js - VintEx SMS sending.
 *
 * Requires env vars: VINTEX_API_KEY, VINTEX_EMAIL
 * Optional env vars: VINTEX_SENDER_ID, VINTEX_BASE_URL
 */

import axios from 'axios';
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

async function sendSms({ recipients, message, campaignID, campaign_name }) {
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
    return response.data;
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

export async function sendOtpSms(phone, otp) {
  return sendSms({
    recipients: phone,
    message: `Your Tafuta verification code is ${otp}. It expires in 10 minutes. Do not share it with anyone.`,
    campaign_name: 'Tafuta OTP',
  });
}
