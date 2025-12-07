/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { URLSearchParams, URL } from 'url';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Definição de __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega o .env da raiz do projeto (um nível acima de /server)
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || 3000;
const externalApiBaseUrl = 'https://generativelanguage.googleapis.com';
const externalWsBaseUrl = 'wss://generativelanguage.googleapis.com';
const apiKey = process.env.IA_API_KEY || process.env.API_KEY;

const staticPath = path.join(__dirname, '../dist');
const publicPath = path.join(__dirname, 'public');

// Logs iniciais para diagnóstico
console.log("--- INICIANDO SERVIDOR BACKEND ---");
console.log(`Carregando .env de: ${envPath}`);
if (process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN) {
    console.log("✅ Token do Shopify encontrado.");
} else {
    console.error("❌ Token do Shopify (SHOPIFY_ADMIN_API_ACCESS_TOKEN) NÃO encontrado no .env");
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.set('trust proxy', 1);

// Middleware de CORS Global para desenvolvimento local
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const defaultOrigin = process.env.PUBLIC_ORIGIN || 'http://localhost:5173';
  const allowedOrigin = origin || defaultOrigin;

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization,x-goog-api-key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Passar direto se for OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Rate limiter
const proxyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api-proxy', proxyLimiter);

// --- ROTA DE PROXY DO SHOPIFY (Local Development) ---
// Esta rota simula o que a função Serverless da Vercel faz.
app.all('/api/shopify-proxy', async (req, res) => {
  console.log(`[Shopify Proxy Local] Recebido: ${req.method}`);
  
  const shopifyAdminToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  const shopifyShopName = process.env.SHOPIFY_SHOP_NAME;

  if (!shopifyAdminToken || !shopifyShopName) {
    console.error('[Shopify Proxy] Credenciais ausentes.');
    return res.status(500).json({ message: 'Credenciais do Shopify não configuradas no arquivo .env local.' });
  }

  const searchQuery = req.query.search ? req.query.search.trim() : '';
  const shopifyApiUrl = `https://${shopifyShopName}.myshopify.com/admin/api/2024-04/graphql.json`;

  const productFieldsFragment = `
    edges {
      node {
        id
        title
        featuredImage {
          url(transform: {maxWidth: 250, maxHeight: 250})
        }
        variants(first: 1) {
          edges {
            node {
              sku
              barcode
            }
          }
        }
      }
    }
  `;

  let graphqlQuery;
  let variables = {};
  let fullQueryString;

  if (searchQuery) {
    if (searchQuery.includes(' ')) {
        const searchWords = searchQuery.split(' ').filter(word => word.length > 0);
        const titleClauses = searchWords.map(word => `title:*${word}*`).join(' AND ');
        fullQueryString = `(${titleClauses}) AND published_status:active`;
    } else {
        fullQueryString = `(sku:${searchQuery} OR barcode:${searchQuery} OR title:*${searchQuery}*) AND published_status:active`;
    }

    graphqlQuery = `
      query searchProducts($queryString: String!) {
        products(first: 20, query: $queryString) {
          ${productFieldsFragment}
        }
      }
    `;
    variables = { queryString: fullQueryString };
  } else {
    graphqlQuery = `
      query getRecentProducts {
        products(first: 20, sortKey: UPDATED_AT, reverse: true, query: "published_status:active") {
          ${productFieldsFragment}
        }
      }
    `;
  }

  try {
    const response = await axios.post(
      shopifyApiUrl,
      { query: graphqlQuery, variables: variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAdminToken,
        },
      }
    );

    if (response.data.errors) {
      console.error('Erro GraphQL Shopify:', JSON.stringify(response.data.errors, null, 2));
      return res.status(500).json({ message: 'Erro da API do Shopify.', details: response.data.errors });
    }

    const products = response.data.data.products.edges.map(({ node }) => {
      const firstVariant = node.variants?.edges?.[0]?.node;
      return {
        id: node.id,
        name: node.title,
        imageUrl: node.featuredImage?.url,
        sku: firstVariant?.sku ?? null,
        barcode: firstVariant?.barcode ?? null,
      };
    }).filter(p => p.imageUrl);

    console.log(`[Shopify Proxy] Sucesso. ${products.length} produtos encontrados.`);
    res.status(200).json(products);

  } catch (error) {
    console.error('[Shopify Proxy] Falha na requisição Axios:', error.message);
    const statusCode = error.response?.status || 502;
    res.status(statusCode).json({ message: 'Erro na conexão com Shopify', details: error.message });
  }
});

// --- ROTA DE PROXY DO GEMINI ---
app.use('/api-proxy', async (req, res, next) => {
    // ... (WebSocket upgrade logic skipped for brevity, handled by server 'upgrade' event)
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        return next();
    }

    const targetPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
    const apiUrl = `${externalApiBaseUrl}/${targetPath}`;

    const outgoingHeaders = {};
    for (const header in req.headers) {
        if (!['host', 'connection', 'content-length'].includes(header.toLowerCase())) {
            outgoingHeaders[header] = req.headers[header];
        }
    }
    outgoingHeaders['X-Goog-Api-Key'] = apiKey;
    if (req.headers['content-type']) outgoingHeaders['Content-Type'] = req.headers['content-type'];
    else outgoingHeaders['Content-Type'] = 'application/json';

    try {
        const axiosConfig = {
            method: req.method,
            url: apiUrl,
            headers: outgoingHeaders,
            responseType: 'stream',
            data: ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) ? req.body : undefined
        };

        const apiResponse = await axios(axiosConfig);
        
        // Copiar headers
        for (const header in apiResponse.headers) {
            res.setHeader(header, apiResponse.headers[header]);
        }
        res.status(apiResponse.status);
        apiResponse.data.pipe(res);

    } catch (error) {
        console.error('Gemini Proxy Error:', error.message);
        if (!res.headersSent) {
            res.status(502).json({ error: 'Proxy error' });
        }
    }
});

// Servir arquivos estáticos
app.get('/service-worker.js', (req, res) => res.sendFile(path.join(publicPath, 'service-worker.js')));
app.get('/public/*', (req, res) => {
    const filePath = path.join(__dirname, req.path); // req.path já inclui /public
    res.sendFile(filePath);
});
app.use(express.static(staticPath));

// Fallback para SPA (Single Page Application)
app.get('*', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Se não houver build, serve um aviso simples ou o placeholder
        res.sendFile(path.join(publicPath, 'placeholder.html'));
    }
});

const server = app.listen(port, () => {
    console.log(`\n🚀 SERVIDOR BACKEND RODANDO NA PORTA ${port}`);
    console.log(`➜ Proxy Shopify: http://localhost:${port}/api/shopify-proxy`);
    console.log(`➜ Proxy Gemini: http://localhost:${port}/api-proxy`);
});

// WebSocket Server (código mantido igual, apenas anexado ao server)
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
    // ... (Lógica de WebSocket mantida a mesma do arquivo original, omitida aqui para economizar espaço mas deve estar no arquivo final)
     const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname;

    if (pathname.startsWith('/api-proxy/')) {
        if (!apiKey) {
            socket.destroy();
            return;
        }
        wss.handleUpgrade(request, socket, head, (clientWs) => {
             const targetPathSegment = pathname.substring('/api-proxy'.length);
            const clientQuery = new URLSearchParams(requestUrl.search);
            clientQuery.set('key', apiKey);
            const targetGeminiWsUrl = `${externalWsBaseUrl}${targetPathSegment}?${clientQuery.toString()}`;

            const geminiWs = new WebSocket(targetGeminiWsUrl);
            
            geminiWs.on('open', () => {});
            geminiWs.on('message', (msg) => clientWs.send(msg));
            clientWs.on('message', (msg) => geminiWs.send(msg));
            
            // Tratamento de erros e fechamento básico
            geminiWs.on('error', () => clientWs.close());
            clientWs.on('error', () => geminiWs.close());
            geminiWs.on('close', () => clientWs.close());
            clientWs.on('close', () => geminiWs.close());
        });
    } else {
        socket.destroy();
    }
});