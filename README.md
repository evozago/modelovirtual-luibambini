# Editor de Looks com IA para Lui Bambini

Este é um aplicativo web que usa a API do Gemini para gerar imagens de modelos virtuais vestindo peças de roupa da sua loja Shopify.

## Configuração e Deploy na Vercel

Este projeto é otimizado para deploy na Vercel.

### 1. Pré-requisitos

-   Uma conta na [Vercel](https://vercel.com).
-   Uma conta no [GitHub](https://github.com) (ou similar).
-   Acesso de Administrador à sua loja Shopify.
-   Uma chave de API do [Google AI Studio (Gemini)](https://aistudio.google.com/app/apikey).

### 2. Fork do Repositório

Faça um "fork" deste projeto para a sua conta do GitHub.

### 3. Criando o Projeto na Vercel

1.  No seu painel da Vercel, clique em **"Add New... -> Project"**.
2.  Importe o repositório que você acabou de criar.
3.  A Vercel irá detectar automaticamente que é um projeto **Vite** e preencherá as configurações de build. Você não precisa mudar nada.

### 4. Configurando as Variáveis de Ambiente

Antes de fazer o deploy, você precisa configurar as chaves de API. Na Vercel, vá para **Settings -> Environment Variables** e adicione as seguintes variáveis:

| Nome da Variável                | Valor                                                                                                | Descrição                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `IA_API_KEY`                    | `AIza...`                                                                                            | Sua chave de API do Gemini, obtida no Google AI Studio.                                               |
| `SHOPIFY_SHOP_NAME`             | `sua-loja-123`                                                                                       | O nome da sua loja Shopify (a parte que vem antes de `.myshopify.com`).                               |
| `SHOPIFY_ADMIN_API_ACCESS_TOKEN` | `shpat_...`                                                                                          | O token de acesso da API Admin do Shopify. [Como gerar um](https://help.shopify.com/pt-BR/manual/apps/custom-apps). |

**Importante:** Certifique-se de que as variáveis estão disponíveis para todos os ambientes (Production, Preview, Development).

### 5. Deploy

Após configurar as variáveis, clique em **"Deploy"**. A Vercel irá construir e publicar seu site. O domínio principal será algo como `seu-projeto.vercel.app`, e você pode adicionar um domínio customizado (como `ia.luibambini.com.br`) na aba **"Domains"**.

É isso! Seu aplicativo estará no ar.
