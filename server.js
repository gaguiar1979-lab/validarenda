const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '.')));

const ANTHROPIC_KEY = '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';

app.post('/api/analyze', async (req, res) => {
  try {
    const payload = req.body.payload;
    if (!payload) return res.status(400).json({ error: 'Payload não informado' });

    const payloadStr = JSON.stringify(payload);

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payloadStr)
        }
      };
      const req2 = https.request(options, (resp) => {
        let data = '';
        resp.on('data', chunk => { data += chunk; });
        resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
      });
      req2.on('error', reject);
      req2.write(payloadStr);
      req2.end();
    });

    const parsed = JSON.parse(result.body);
    res.status(result.status).json(parsed);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
