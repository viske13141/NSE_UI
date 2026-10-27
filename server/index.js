const express    = require('express');
const cors       = require('cors');
const config     = require('./src/config/env');
const kycRoutes  = require('./src/routes/kycRoutes');
const iwRoutes   = require('./src/routes/investwellRoutes');
const starmfRoutes = require('./src/routes/starmfRoutes');
const bseAuthRoutes    = require('./src/routes/bseAuthRoutes');
const bseWebhookRoutes = require('./src/routes/bseWebhookRoutes');
const errorHandler     = require('./src/middleware/errorHandler');
const nseRoutes        = require('./src/routes/nseRoutes');
const nsePublicRoutes  = require('./src/routes/nsePublicRoutes');

const app = express();

app.use(cors({ origin: config.frontendOrigin }));
// Base64 expands a 5 MB mandate scan to about 6.7 MB; scope the larger body limit.
app.use('/nse-api/mandate/image-upload', express.json({ limit: '8mb' }));
app.use('/nse-api/aof/image-upload', express.json({ limit: '8mb' }));
app.use('/nse-api/fatca/image-upload', express.json({ limit: '8mb' }));
app.use('/nse-api/cancel-cheque/upload', express.json({ limit: '8mb' }));
app.use('/nse-api/poa/upload', express.json({ limit: '8mb' }));
app.use('/nse-api/nft/image-upload', express.json({ limit: '8mb' }));
app.use(express.json());

// Routes
app.use('/nse-api', nseRoutes);
app.use('/nse-api/public', nsePublicRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/iw-api',  iwRoutes);
app.use('/starmf-api', starmfRoutes);
app.use('/api/bse', bseAuthRoutes);    // BSE authentication
app.use('/api/bse', bseWebhookRoutes); // BSE webhook + order status

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[Server] Running on http://localhost:${config.port}`);
});
