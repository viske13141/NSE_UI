/**
 * nsePublicRoutes.js
 *
 * Serves the NSE scheme master catalogue to authenticated Lendrix customers
 * without requiring a browser-side NSE token.
 *
 * The server logs in to NSE using credentials stored in server/.env
 * (NSE_USERNAME, NSE_PASSWORD). The resulting NSE Bearer token is cached
 * server-side and is never sent to the browser.
 *
 * Route:  GET /nse-api/public/schemes
 * Auth:   None required from the browser (Lendrix customer session is
 *         sufficient to reach this endpoint via the existing CORS policy).
 *
 * IMPORTANT: Set NSE_USERNAME and NSE_PASSWORD in server/.env before use.
 * If those variables are not set this route returns 503 immediately.
 */
const express = require('express');
const axios   = require('axios');
const config  = require('../config/env');

const router = express.Router();

// ── Server-side NSE token cache ───────────────────────────────────────────────
// Token TTL: NSE sessions are typically valid for 30 minutes.
// We refresh 2 minutes early to avoid serving a stale token.
const TOKEN_TTL_MS = 28 * 60 * 1000;
let cachedToken  = null;
let tokenExpiry  = 0;
let tokenPending = null; // in-flight login promise (prevents stampede)

async function getServerNSEToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  if (tokenPending) return tokenPending;

  tokenPending = (async () => {
    const { username, password, baseUrl } = config.nse;
    if (!username || !password) {
      throw new Error(
        'NSE_USERNAME and NSE_PASSWORD must be set in server/.env to serve the scheme catalogue.',
      );
    }
    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/auth/login`;
    const { data } = await axios.post(url, { username, password }, { timeout: 15000 });
    if (!data?.access_token) {
      throw new Error(data?.message || 'NSE login failed: no access_token in response');
    }
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + TOKEN_TTL_MS;
    return cachedToken;
  })().finally(() => { tokenPending = null; });

  return tokenPending;
}

// ── GET /nse-api/public/schemes ───────────────────────────────────────────────
router.get('/schemes', async (_req, res) => {
  const { username, password } = config.nse;
  if (!username || !password) {
    return res.status(503).json({
      error: 'Scheme catalogue is unavailable: NSE_USERNAME and NSE_PASSWORD are not configured on the server.',
    });
  }

  try {
    const token = await getServerNSEToken();
    const url   = `${config.nse.baseUrl.replace(/\/$/, '')}/api/v1/reports/master-download`;
    const { data, status } = await axios.post(
      url,
      { file_type: 'SCH' },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/plain, application/json',
          'Content-Type': 'application/json',
        },
        responseType: 'text',
        timeout: 60000,
        validateStatus: () => true,
      },
    );

    if (status === 401) {
      // Token expired mid-flight — invalidate cache and tell the client to retry
      cachedToken = null; tokenExpiry = 0;
      return res.status(503).json({ error: 'NSE session expired. Retry in a moment.' });
    }
    if (status !== 200) {
      return res.status(502).json({ error: `NSE returned HTTP ${status} for scheme master download.` });
    }

    // Return the raw pipe-delimited text exactly as NSE sends it.
    return res.status(200).type('text/plain').send(data);
  } catch (err) {
    const message = err.message || 'Unable to fetch scheme catalogue from NSE';
    return res.status(502).json({ error: message });
  }
});

module.exports = router;
