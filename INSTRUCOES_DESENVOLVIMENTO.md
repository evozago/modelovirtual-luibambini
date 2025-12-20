# 📋 Instruções para Desenvolvimento Local

## 🔍 Problema Identificado

O erro **404 File not found** na função "Buscar na Loja" acontece porque o servidor backend não está rodando. A aplicação precisa de **dois servidores** funcionando ao mesmo tempo:

1. **Backend** (porta 3000) - Faz a conexão com o Shopify
2. **Frontend** (porta 5173) - Interface do usuário (Vite)

## ✅ Solução Aplicada

### 1. Credenciais Configuradas

O arquivo `.env` foi criado com as credenciais do Shopify:
- ✅ `SHOPIFY_ADMIN_API_ACCESS_TOKEN`
- ✅ `SHOPIFY_SHOP_NAME`

### 2. Proxy Configurado

O arquivo `vite.config.ts` **já estava configurado corretamente** com proxy para redirecionar requisições `/api/*` do frontend (porta 5173) para o backend (porta 3000).

## 🚀 Como Rodar o Projeto

### Opção A: Script Automático (RECOMENDADO)

Execute o script que inicia ambos os servidores automaticamente:

```bash
./start-dev.sh
```

Este script irá:
1. Instalar dependências do backend e frontend
2. Iniciar o servidor backend na porta 3000
3. Iniciar o frontend na porta 5173
4. Manter ambos rodando simultaneamente

Para parar, pressione `Ctrl+C` no terminal.

### Opção B: Dois Terminais Separados

Se preferir controle manual, abra **dois terminais**:

**Terminal 1 - Backend:**
```bash
npm run server
```

Você verá:
```
🚀 SERVIDOR BACKEND RODANDO NA PORTA 3000
➜ Proxy Shopify: http://localhost:3000/api/shopify-proxy
➜ Proxy Gemini: http://localhost:3000/api-proxy
✅ Token do Shopify encontrado.
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Você verá:
```
VITE v6.2.0  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

## 🧪 Como Testar

1. Acesse `http://localhost:5173` no navegador
2. Clique em qualquer botão **"Buscar na Loja"**
3. O modal deve abrir e carregar produtos do Shopify automaticamente
4. Digite um termo de busca para filtrar produtos

## 🔧 Verificação de Problemas

### O backend não inicia?

Verifique se as dependências estão instaladas:
```bash
cd server
npm install
cd ..
```

### Erro de conexão com Shopify?

Verifique se o arquivo `.env` está na raiz do projeto e contém:
```
SHOPIFY_ADMIN_API_ACCESS_TOKEN=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
SHOPIFY_SHOP_NAME=luibambini-9396
```

### Ainda recebe erro 404?

1. Confirme que o backend está rodando (Terminal 1 deve mostrar "SERVIDOR BACKEND RODANDO")
2. Abra o console do navegador (F12) e verifique se há erros
3. Teste diretamente: `http://localhost:3000/api/shopify-proxy` deve retornar JSON com produtos

## 📦 Deploy na Vercel

Para produção, você precisa configurar as **variáveis de ambiente na Vercel**:

1. Acesse o painel do projeto na Vercel
2. Vá em **Settings → Environment Variables**
3. Adicione:
   - `SHOPIFY_ADMIN_API_ACCESS_TOKEN` = `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`
   - `SHOPIFY_SHOP_NAME` = `luibambini-9396`
   - `IA_API_KEY` = (sua chave do Gemini)
4. Faça um novo deploy

Na Vercel, a função serverless `api/shopify-proxy.js` será usada automaticamente, e você **não precisa** rodar o servidor backend manualmente.

## 📝 Estrutura do Fluxo

```
Usuário clica "Buscar na Loja"
    ↓
ProductSearchModal.tsx chama searchProducts()
    ↓
storefrontService.ts faz fetch('/api/shopify-proxy?search=...')
    ↓
Vite proxy redireciona para http://localhost:3000/api/shopify-proxy
    ↓
server/server.js recebe a requisição
    ↓
Faz requisição GraphQL para Shopify Admin API
    ↓
Retorna produtos para o frontend
    ↓
Modal exibe os produtos
```

## ✨ Resumo

- ✅ **Código já estava correto**
- ✅ **Credenciais configuradas**
- ✅ **Script de inicialização criado**
- ⚠️ **Importante**: Sempre rode backend + frontend juntos em desenvolvimento local
- 🌐 **Em produção (Vercel)**: Configure as variáveis de ambiente no painel
