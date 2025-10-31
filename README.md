# Criador de Modelos com IA - Lui Bambini

Esta é uma aplicação com IA para criar materiais de marketing para produtos de vestuário. Envie fotos das suas roupas e a aplicação irá:
1. Remover o fundo para criar uma foto de produto limpa.
2. Gerar uma descrição de marketing e um comando criativo.
3. Gerar uma imagem de um(a) modelo vestindo a peça de roupa.

## Integração com Shopify & Deploy via Vercel

Esta aplicação foi projetada para se conectar diretamente à sua loja Shopify para buscar imagens de produtos, otimizando seu fluxo de trabalho. A conexão é tratada de forma segura através de uma Vercel Serverless Function.

Para implantar esta aplicação e conectá-la à sua loja Shopify, siga estes passos:

### 1. Envie para o GitHub
Se ainda não o fez, envie todo o código do projeto para um novo repositório na sua conta do GitHub.

### 2. Faça o Deploy com a Vercel
1. Acesse [vercel.com](https://vercel.com) e crie um novo projeto.
2. Importe seu repositório do GitHub. A Vercel detectará automaticamente o frontend Vite e a função serverless no diretório `/api`. Nenhuma configuração de build especial é necessária.
3. Antes de fazer o deploy, vá para as **Configurações** (Settings) do projeto -> **Variáveis de Ambiente** (Environment Variables).
4. Adicione os seguintes segredos:

    | Nome (Name)                     | Valor (Value)                                     | Descrição                                          |
    | ------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
    | `VITE_GEMINI_API_KEY`           | `sua-chave-api-gemini`                            | Sua chave de API do Google Gemini. **Importante:** O nome deve começar com `VITE_` para que o frontend possa acessá-la durante o build. |
    | `SHOPIFY_ADMIN_API_ACCESS_TOKEN`| `shpat_...`                                       | Seu token de acesso da API Admin do Shopify.       |
    | `SHOPIFY_SHOP_NAME`             | `nome-da-sua-loja`                                | De `nome-da-sua-loja.myshopify.com`.                |

5. Clique em **Deploy**. A Vercel irá construir e implantar sua aplicação.

Uma vez implantado, a funcionalidade "Buscar na Loja" dentro do aplicativo estará totalmente conectada aos seus produtos Shopify.
