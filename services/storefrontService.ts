// INSTRUÇÕES DE CONFIGURAÇÃO
// A busca de produtos é feita de forma segura através de uma Vercel Serverless Function.
// Para que funcione, você deve configurar as seguintes variáveis de ambiente
// no painel do seu projeto na Vercel:
// 1. SHOPIFY_ADMIN_API_ACCESS_TOKEN -> O seu token que começa com "shpat_"
// 2. SHOPIFY_SHOP_NAME -> O nome da sua loja (ex: "sua-loja-1234")

export interface StoreProduct {
  id: string;
  name: string;
  imageUrl: string;
  sku: string | null;
  barcode: string | null;
}

// --- CONFIGURAÇÃO MANUAL NECESSÁRIA PARA TESTES ---
// O ambiente de desenvolvimento (AI Studio) não sabe o endereço do seu backend (a função na Vercel).
// Para que a busca de produtos funcione, a URL da sua aplicação Vercel está configurada abaixo.
const VERCEL_DEPLOYMENT_URL = 'https://ia.luibambini.com.br';

// O código abaixo usa a variável de ambiente VITE_API_BASE_URL (para produção na Vercel)
// ou a URL manual que você configurou acima (para desenvolvimento/testes).
// A verificação `import.meta.env && ...` previne o crash quando `import.meta.env` é indefinido.
// FIX: Cast `import.meta` to `any` to resolve TypeScript error about missing `env` property.
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || VERCEL_DEPLOYMENT_URL || '';


/**
 * Busca produtos fazendo uma requisição à nossa Vercel Serverless Function, que atua como um proxy seguro para a API Admin do Shopify.
 * @param query A string de busca para filtrar produtos por SKU, código de barras ou título.
 * @returns Uma promessa que resolve para um array de produtos.
 */
export const searchProducts = async (query: string): Promise<StoreProduct[]> => {
  // Se a URL não estiver configurada, lançamos um erro claro.
  if (!API_BASE_URL) {
     throw new Error('A URL da API (API_BASE_URL) não foi configurada. Verifique as variáveis de ambiente ou a configuração manual no arquivo `services/storefrontService.ts`.');
  }

  console.log(`Buscando por: "${query}" através da função serverless em ${API_BASE_URL}.`);

  try {
    // Constrói a URL completa para a API.
    const apiUrl = `${API_BASE_URL}/api/shopify-proxy?search=${encodeURIComponent(query)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      let errorMessage = `Erro na comunicação com o servidor: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.text();
        // Tenta interpretar como JSON, mas não falha se não for
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || `Erro do servidor: ${JSON.stringify(errorJson)}`;
        } catch (e) {
          // Se não for JSON, é provável que seja um erro de infraestrutura (ex: HTML de erro da Vercel)
          errorMessage = `O servidor retornou uma resposta inesperada. Verifique os logs da função na Vercel. Resposta: ${errorBody.substring(0, 300)}...`;
        }
      } catch (e) {
        // Ignora se não conseguir ler o corpo do erro
      }
      throw new Error(errorMessage);
    }

    const products: StoreProduct[] = await response.json();
    return products;

  } catch (error) {
    console.error('Falha ao conectar com a função serverless:', error);
    // Propaga a mensagem de erro detalhada que criamos acima, ou uma genérica.
    const message = error instanceof Error ? error.message : 'Não foi possível carregar os produtos. Verifique a configuração na Vercel.';
    throw new Error(message);
  }
};
