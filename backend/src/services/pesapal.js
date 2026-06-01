import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const PESAPAL_BASE_URL = config.pesapal.env === 'production'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3';

class PesaPalService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.ipnId = null; // cached after first registerIPN call
  }

  async getAuthToken() {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
        consumer_key: config.pesapal.consumerKey,
        consumer_secret: config.pesapal.consumerSecret,
      });

      this.token = response.data.token;
      this.tokenExpiry = Date.now() + (50 * 60 * 1000); // 50 minutes
      return this.token;
    } catch (error) {
      logger.error('PesaPal auth failed', { error: error.message, response: error.response?.data });
      throw new Error('Failed to authenticate with PesaPal');
    }
  }

  // Registers the IPN URL with PesaPal and caches the returned ipn_id.
  // PesaPal returns the same ipn_id if the URL is already registered,
  // so calling this multiple times is safe.
  async getIpnId() {
    if (this.ipnId) return this.ipnId;

    const token = await this.getAuthToken();

    try {
      const response = await axios.post(
        `${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`,
        {
          url: config.pesapal.ipnUrl,
          ipn_notification_type: 'POST',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const ipnId = response.data.ipn_id;
      if (!ipnId) {
        logger.error('PesaPal IPN registration returned no ipn_id', { response: response.data });
        throw new Error('PesaPal IPN registration returned no ipn_id');
      }

      this.ipnId = ipnId;
      logger.info('PesaPal IPN registered', { ipnId, url: config.pesapal.ipnUrl });
      return this.ipnId;
    } catch (error) {
      logger.error('PesaPal IPN registration failed', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error('Failed to register IPN with PesaPal');
    }
  }

  async submitOrder(orderData) {
    const [token, notificationId] = await Promise.all([
      this.getAuthToken(),
      this.getIpnId(),
    ]);

    const payload = {
      id: orderData.merchant_reference,
      currency: orderData.currency || 'KES',
      amount: orderData.amount,
      description: orderData.description,
      callback_url: config.pesapal.callbackUrl,
      notification_id: notificationId,
      billing_address: {
        email_address: orderData.email,
        phone_number: orderData.phone,
        country_code: 'KE',
        first_name: orderData.first_name,
        last_name: orderData.last_name || '',
      },
    };

    try {
      const response = await axios.post(
        `${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Surface PesaPal-level errors (status 200 but error in body)
      if (response.data.error) {
        logger.error('PesaPal order submission error', { pesapalError: response.data.error });
        throw new Error(`PesaPal error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
      }

      return response.data;
    } catch (error) {
      if (error.message.startsWith('PesaPal error:')) throw error;
      logger.error('PesaPal order submission failed', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Failed to submit order to PesaPal: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getTransactionStatus(orderTrackingId) {
    const token = await this.getAuthToken();

    try {
      const response = await axios.get(
        `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('PesaPal status check failed', { error: error.message });
      throw new Error('Failed to get transaction status from PesaPal');
    }
  }
}

export default new PesaPalService();
