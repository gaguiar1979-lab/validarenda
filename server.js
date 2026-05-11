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

// Helper: HTTPS request com timeout de 30s
function httpsRequest(options, body = null, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout após ${timeoutMs/1000}s`));
    });
    if (body) req.write(body);
    req.end();
  });
}

// CV API: busca documentos do pré-cadastro
app.get('/api/cv/precadastro/:id/documentos', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await httpsRequest({
      hostname: CV_BASE,
      path: `/api/v1/comercial/precadastro/${id}/documentos`,
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

// CV API: busca informações do pré-cadastro
app.get('/api/cv/precadastro/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await httpsRequest({
      hostname: CV_BASE,
      path: `/api/v1/comercial/precadastro/${id}`,
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

// CV API: busca documentos do repasse
app.get('/api/cv/repasse/:id/documentos', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await httpsRequest({
      hostname: CV_BASE,
      path: `/api/v1/comercial/repasses/${id}/documentos`,
      method: 'GET',
      headers: { 'email': CV_EMAIL, 'token': CV_TOKEN, 'Content-Type': 'application/json' }
    });
    const data = JSON.parse(result.body);
    res.status(result.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CV API: busca informações do repasse
app.get('/api/cv/repasse/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await httpsRequest({
      hostname: CV_BASE,
      path: `/api/v1/comercial/repasses/${id}`,
      method: 'GET',
      headers: { 'email': CV_EMAIL, 'token': CV_TOKEN, 'Content-Type': 'application/json' }
    });
    const data = JSON.parse(result.body);
    res.status(result.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// Anthropic proxy (não-streaming — usado para certidão, filhos, etc.)
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

// Anthropic proxy com streaming — evita timeout no Railway para análises longas
app.post('/api/analyze-stream', (req, res) => {
  try {
    const payload = req.body.payload;
    if (!payload) return res.status(400).json({ error: 'Payload não informado' });

    payload.stream = true;
    const payloadStr = JSON.stringify(payload);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');

    const apiReq = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payloadStr)
      }
    }, (apiRes) => {
      apiRes.pipe(res);
    });

    apiReq.on('error', (e) => {
      if (!res.headersSent) res.status(500).json({ error: e.message });
      else res.end();
    });

    apiReq.write(payloadStr);
    apiReq.end();
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// Gera PDF simples com o conteúdo do relatório
function gerarPDF(conteudo) {
  // Substitui caracteres especiais por equivalentes ASCII para compatibilidade PDF
  const texto = conteudo
    .replace(/[áàãâä]/g, 'a').replace(/[ÁÀÃÂÄ]/g, 'A')
    .replace(/[éèêë]/g, 'e').replace(/[ÉÈÊË]/g, 'E')
    .replace(/[íìîï]/g, 'i').replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[óòõôö]/g, 'o').replace(/[ÓÒÕÔÖ]/g, 'O')
    .replace(/[úùûü]/g, 'u').replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/[^\x20-\x7E\n]/g, '?');

  const linhas = texto.split('\n');
  let streamContent = 'BT\n/F1 10 Tf\n';
  let y = 750;
  for (const linha of linhas) {
    const safe = linha.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    streamContent += `100 ${y} Td (${safe}) Tj 0 0 Td\n`;
    y -= 14;
    if (y < 50) { streamContent += 'ET\nBT\n/F1 10 Tf\n'; y = 750; }
  }
  streamContent += 'ET';

  const stream = Buffer.from(streamContent);
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${stream.length}>>
stream
${streamContent}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Courier>>endobj
xref
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%EOF`;
  return Buffer.from(pdf);
}

// CV API: salva relatório no pré-cadastro
app.post('/api/cv/precadastro/:id/salvar-relatorio', async (req, res) => {
  try {
    const precadastroId = req.params.id;
    const { pdfBase64, fileName, periodo } = req.body;
    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    const nome = fileName || `Analise da Renda pelo Validador - PreCadastro ${precadastroId} - ${dataHoje}.pdf`;

    const payload = JSON.stringify({
      idprecadastro: parseInt(precadastroId),
      idtipo: 28, // OUTROS DOCUMENTOS
      nome,
      documento_base64: pdfBase64
    });

    const result = await httpsRequest({
      hostname: CV_BASE,
      path: '/api/v1/comercial/precadastro/documentos',
      method: 'POST',
      headers: {
        'email': CV_EMAIL,
        'token': CV_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    res.status(result.status).json({ ok: result.status < 300, raw: result.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CV API: salva relatório na reserva
app.post('/api/cv/reserva/:id/salvar-relatorio', async (req, res) => {
  try {
    const reservaId = req.params.id;
    const { pdfBase64, fileName, periodo } = req.body;
    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    const nome = fileName || `Analise da Renda pelo Validador - Reserva ${reservaId} - ${dataHoje}.pdf`;

    const payload = JSON.stringify({
      idreserva: parseInt(reservaId),
      idtipo: 28, // OUTROS DOCUMENTOS
      nome,
      documento_base64: pdfBase64
    });

    const result = await httpsRequest({
      hostname: CV_BASE,
      path: '/api/v1/comercial/reservas/documentos',
      method: 'POST',
      headers: {
        'email': CV_EMAIL,
        'token': CV_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    res.status(result.status).json({ ok: result.status < 300, raw: result.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CV API: salva relatório no repasse
app.post('/api/cv/repasse/:id/salvar-relatorio', async (req, res) => {
  try {
    const repasseId = req.params.id;
    const { pdfBase64, fileName, periodo } = req.body;
    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    const nome = fileName || `Analise da Renda pelo Validador - Repasse ${repasseId} - ${dataHoje}.pdf`;

    const payload = JSON.stringify({
      idrepasse: parseInt(repasseId),
      idtipo: 28, // OUTROS DOCUMENTOS
      nome,
      documento_base64: pdfBase64
    });

    const result = await httpsRequest({
      hostname: CV_BASE,
      path: '/api/v1/comercial/repasses/documentos',
      method: 'POST',
      headers: {
        'email': CV_EMAIL,
        'token': CV_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    res.status(result.status).json({ ok: result.status < 300, raw: result.body });
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
