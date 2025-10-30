// Importa o 'axios' que é necessário para fazer a requisição HTTP.
// Você precisará adicionar 'axios' às dependências do seu projeto: npm install axios
const axios = require('axios');

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

  // Se as credenciais não estiverem configuradas, retorna um erro.
  if (!shopifyAdminToken || !shopifyShopName) {
    return res.status(500).json({ message: 'Credenciais da API Admin do Shopify não configuradas nas variáveis de ambiente do servidor.' });
  }

  // Pega o termo de busca da URL (ex: /api/shopify-proxy?search=12345)
  const searchQuery = req.query.search || '';
  const shopifyApiUrl = `https://${shopifyShopName}.myshopify.com/admin/api/2024-04/graphql.json`;

  // A consulta GraphQL para buscar produtos por SKU, código de barras ou título.
  const graphqlQuery = `
    query searchProducts($queryString: String!) {
      products(first: 20, query: $queryString) {
        edges {
          node {
            id
            title
            featuredImage {
              url
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
      }
    }
  `;

  try {
    const response = await axios.post(
      shopifyApiUrl,
      {
        query: graphqlQuery,
        variables: {
          // Constrói a string de busca para procurar em múltiplos campos.
          queryString: `sku:${searchQuery} OR barcode:${searchQuery} OR title:*${searchQuery}*`,
        },
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
    console.error('Erro ao fazer proxy para a API Admin do Shopify:', error.response ? error.response.data : error.message);
    res.status(502).json({ message: 'Falha ao buscar dados do Shopify.' });
  }
}
