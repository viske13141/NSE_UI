const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:8081' }));
app.use(express.json({ limit: '8mb' }));
app.use('/nse-api', require('./src/routes/nseRoutes'));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
const frontend = path.resolve(__dirname, '../dist');
if (fs.existsSync(path.join(frontend, 'index.html'))) {
  app.use(express.static(frontend));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/nse-api')) return res.status(404).json({ message: 'Unknown API endpoint' });
    res.sendFile(path.join(frontend, 'index.html'));
  });
}
const port = process.env.PORT || 5000;
app.listen(port, '127.0.0.1', () => console.log(`Mutual funds API ready at http://localhost:${port}`));
