const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '.')));

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const CV_TOKEN = process.env.CV_TOKEN;
const CV_EMAIL = process.env.CV_EMAIL || 'gustavo@casasmanager.com.br';
const CV_BASE = 'manager.cvcrm.com.br';

// Helper: HTTPS request
function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// CV API: busca documentos da reserva
app.get('/api/cv/reserva/:id/documentos', async (req, res) => {
  try {
    const reservaId = req.params.id;
    const result = await httpsRequest({
      hostname: CV_BASE,
      path: `/api/v1/comercial/reservas/${reservaId}/documentos`,
      method: 'GET',
      headers: {
        'email': CV_EMAIL,
        'token': CV_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    const data = JSON.parse(result.body);
    res.status(result.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CV API: busca informações da reserva
app.get('/api/cv/reserva/:id', async (req, res) => {
  try {
    const reservaId = req.params.id;
    const result = await httpsRequest({
      hostname: CV_BASE,
      path: `/api/v1/comercial/reservas/${reservaId}`,
      method: 'GET',
      headers: {
        'email': CV_EMAIL,
        'token': CV_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    const data = JSON.parse(result.body);
    res.status(result.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CV API: baixa arquivo do documento
app.get('/api/cv/documento/arquivo', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'URL não informada' });

    const urlObj = new URL(url);
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'email': CV_EMAIL,
          'token': CV_TOKEN
        }
      };
      const req2 = https.request(options, (resp) => {
        const chunks = [];
        resp.on('data', chunk => chunks.push(chunk));
        resp.on('end', () => resolve({
          status: resp.statusCode,
          headers: resp.headers,
          body: Buffer.concat(chunks)
        }));
      });
      req2.on('error', reject);
      req2.end();
    });

    const b64 = result.body.toString('base64');
    const contentType = result.headers['content-type'] || 'application/octet-stream';
    res.json({ base64: b64, contentType, status: result.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Anthropic proxy
app.post('/api/analyze', async (req, res) => {
  try {
    const payload = req.body.payload;
    if (!payload) return res.status(400).json({ error: 'Payload não informado' });

    const payloadStr = JSON.stringify(payload);
    const result = await httpsRequest({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payloadStr)
      }
    }, payloadStr);

    const parsed = JSON.parse(result.body);
    res.status(result.status).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/logo.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'logo.jpg'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
