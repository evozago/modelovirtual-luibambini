// Usa a sintaxe de import do ES Modules, pois o projeto está configurado com "type": "module" no package.json.
import axios from 'axios';

// Esta é a função principal que a Vercel executará.
export default async function handler(req, res) {
  // Configura os cabeçalhos CORS para permitir que nosso app frontend chame esta função.
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Em produção, restrinja para o seu domínio: 'https://seu-site.com'
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // O navegador envia uma requisição OPTIONS "preflight" antes da requisição GET real para verificar as permissões CORS.
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Pega as credenciais das variáveis de ambiente configuradas no painel da Vercel.
  const shopifyAdminToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  const shopifyShopName = process.env.SHOPIFY_SHOP_NAME;

  // Se as credenciais não estiverem configuradas, retorna um erro claro.
  if (!shopifyAdminToken || !shopifyShopName) {
    return res.status(500).json({ message: 'Credenciais da API Admin do Shopify não configuradas nas variáveis de ambiente do servidor.' });
  }

  // Pega o termo de busca da URL (ex: /api/shopify-proxy?search=12345) e remove espaços em branco.
  const searchQuery = req.query.search?.trim() || '';
  const shopifyApiUrl = `https://${shopifyShopName}.myshopify.com/admin/api/2024-04/graphql.json`;

  // Define a parte da consulta que seleciona os campos do produto, evitando repetição.
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
  let variables;

  if (searchQuery) {
    // Se houver um termo de busca, constrói uma consulta para filtrar por SKU, código de barras ou título.
    graphqlQuery = `
      query searchProducts($queryString: String!) {
        products(first: 20, query: $queryString) {
          ${productFieldsFragment}
        }
      }
    `;
    variables = {
      queryString: `(sku:${searchQuery} OR barcode:${searchQuery} OR title:*${searchQuery}*) AND published_status:active`,
    };
  } else {
    // Se a busca estiver vazia, carrega os produtos mais recentes que estão publicados.
    graphqlQuery = `
      query getRecentProducts {
        products(first: 20, sortKey: UPDATED_AT, reverse: true, query: "published_status:active") {
          ${productFieldsFragment}
        }
      }
    `;
    variables = {};
  }

  try {
    const response = await axios.post(
      shopifyApiUrl,
      {
        query: graphqlQuery,
        variables: variables,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAdminToken,
        },
      }
    );

    if (response.data.errors) {
      console.error('Erro na GraphQL do Shopify:', response.data.errors);
      return res.status(500).json({ message: 'Erro da API do Shopify.', details: response.data.errors });
    }

    // Mapeia a resposta para o formato que nosso frontend espera.
    const products = response.data.data.products.edges.map(({ node }) => {
      const firstVariant = node.variants?.edges?.[0]?.node;
      return {
        id: node.id,
        name: node.title,
        imageUrl: node.featuredImage?.url,
        sku: firstVariant?.sku ?? null,
        barcode: firstVariant?.barcode ?? null,
      };
    }).filter(p => p.imageUrl); // Garante que só retornamos produtos com imagem.

    // Envia a lista de produtos de volta para o frontend.
    res.status(200).json(products);

  } catch (error) {
        const statusCode = error.response?.status;
    const errorDetails = error.response ? error.response.data : error.message;
    let publicMessage = 'Falha ao buscar dados do Shopify.';
    if (statusCode === 401 || statusCode === 403) {
      publicMessage = 'A API Admin do Shopify rejeitou a requisição. Verifique se o token Admin está correto, se a loja está certa e se o app tem permissão para ler produtos.';
    }

    console.error('Erro ao fazer proxy para a API Admin do Shopify:', {
      status: statusCode,
      details: errorDetails,
    });

    res
      .status(statusCode ?? 502)
      .json({ message: publicMessage, details: errorDetails });
  }
}