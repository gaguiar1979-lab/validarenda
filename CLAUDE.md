# Validador de Renda — Casas Manager Construções

Sistema interno de análise de documentos de renda para qualificação de compradores de imóveis.

## Stack
- Frontend: HTML/CSS/JS puro (sem framework) — tudo em `index.html`
- Backend: Node.js + Express — `server.js`
- IA: Anthropic API (claude-opus-4-5, max_tokens 4000)
- Hospedagem: Railway.app — deploy automático a cada push no branch `main`
- URL produção: validarenda-production.up.railway.app

## Variáveis de ambiente (Railway)
- `ANTHROPIC_API_KEY` — chave da API da Anthropic
- `CV_TOKEN` — token de autenticação do CV CRM
- `CV_EMAIL` — gustavo@casasmanager.com.br
- `PORT` — definido automaticamente pelo Railway

**NUNCA colocar credenciais no código.** O repositório é público.

## CV CRM
- Base URL: manager.cvcrm.com.br
- Autenticação: headers `email` e `token` em todas as requisições

## Rotas do servidor
- `GET /logo.jpg` — serve o logo
- `GET /api/cv/reserva/:id` — busca dados da reserva
- `GET /api/cv/reserva/:id/documentos` — busca documentos da reserva
- `GET /api/cv/documento/arquivo?url=` — baixa arquivo e retorna base64
- `POST /api/analyze` — proxy para API da Anthropic
- `GET *` — serve index.html

## Funcionalidades implementadas
1. Busca por número de reserva no CV CRM
2. Upload manual de documentos
3. Certidão de estado civil → cadastra cônjuge automaticamente
4. Certidão de nascimento → cadastra filhos
5. Comprovante de rendimento (holerite, pró-labore, contracheque)
6. Exclusão de transferências entre familiares
7. Relatório mensal por fonte de renda com parecer detalhado

## Tipos de renda classificados pela IA
`emprego_formal`, `prolabore`, `autonomo`, `aluguel`, `aposentadoria`, `pensao`, `outros`

## Identidade visual
- Navy: #1C1E35 / #2D3060 / #3D4080
- Dourado: #B8952A / #C9A84C
- Fonte: DM Sans + DM Mono
- Site: www.casasmanager.com.br | Instagram: @casasmanager

## Pendências
- [ ] Controle de acesso com login/senha
- [ ] Salvar relatório no CV CRM após análise
- [ ] Testar integração completa com reserva real

## Fluxo de deploy
```
editar arquivos → git add → git commit → git push → Railway faz deploy automático
```
