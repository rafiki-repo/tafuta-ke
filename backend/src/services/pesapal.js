import axios from 'axios';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const PESAPAL_BASE_URL = config.pesapal.env === 'production'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3';

class PesaPalService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
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
      logger.error('PesaPal auth failed', { error: error.message });
      throw new Error('Failed to authenticate with PesaPal');
    }
  }

  async registerIPN() {
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

      return response.data;
    } catch (error) {
      logger.error('PesaPal IPN registration failed', { error: error.message });
      throw new Error('Failed to register IPN with PesaPal');
    }
  }

  async submitOrder(orderData) {
    const token = await this.getAuthToken();

    const payload = {
      id: orderData.merchant_reference,
      currency: orderData.currency || 'KES',
      amount: orderData.amount,
      description: orderData.description,
      callback_url: config.pesapal.callbackUrl,
      notification_id: orderData.notification_id,
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

      return response.data;
    } catch (error) {
      logger.error('PesaPal order submission failed', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error('Failed to submit order to PesaPal');
    }
  }

  async getTransactionStatus(orderTrackingId) {
    const token = await this.getAuthToken();

    try {
      const response = await axios.get(
        `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
