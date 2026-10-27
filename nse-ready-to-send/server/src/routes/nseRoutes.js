const express = require('express');
const axios = require('axios');
const config = require('../config/env');
const allowedPaths = new Set(require('./nsePaths.json'));
const router = express.Router();

// Fixed upstream and documented paths only. Each request carries its own token.
router.post(/.*/, async (req, res) => {
  const route = req.path;
  if (!allowedPaths.has(route)) return res.status(404).json({ message: 'Unknown NSE endpoint' });
  const authorization = req.get('authorization');
  if (route !== '/auth/login' && !/^Bearer\s+\S+$/i.test(authorization || '')) {
    return res.status(401).json({ message: 'NSE login required' });
  }
  try {
    const response = await axios.post(`${config.nse.baseUrl.replace(/\/$/, '')}/api/v1${route}`, req.body, {
      headers: authorization ? { Authorization: authorization } : {},
      timeout: 30000,
      responseType: 'text',
      maxRedirects: 0,
      validateStatus: () => true,
    });
    return res.status(response.status).type(response.headers['content-type'] || 'application/json').send(response.data);
  } catch (error) {
    return res.status(error.code === 'ECONNABORTED' ? 504 : 502).json({ message: 'Unable to reach NSE service. Check status before retrying a transaction.' });
  }
});
module.exports = router;
