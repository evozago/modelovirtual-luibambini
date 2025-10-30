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

/**
 * Busca produtos fazendo uma requisição à nossa Vercel Serverless Function, que atua como um proxy seguro para a API Admin do Shopify.
 * @param query A string de busca para filtrar produtos por SKU, código de barras ou título.
 * @returns Uma promessa que resolve para um array de produtos.
 */
export const searchProducts = async (query: string): Promise<StoreProduct[]> => {
  console.log(`Buscando por: "${query}" através da função serverless.`);

  try {
    // A URL aponta para a nossa função na pasta /api. A Vercel gerencia isso automaticamente.
    const response = await fetch(`/api/shopify-proxy?search=${encodeURIComponent(query)}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro na função serverless: ${response.statusText}`);
    }

    const products: StoreProduct[] = await response.json();
    return products;

  } catch (error) {
    console.error('Falha ao conectar com a função serverless:', error);
    throw new Error('Não foi possível carregar os produtos. Verifique a configuração na Vercel.');
  }
};
