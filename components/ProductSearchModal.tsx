import React, { useState, useEffect, useRef } from 'react';
import { searchProducts } from '../services/storefrontService';
import type { StoreProduct } from '../services/storefrontService';
import { XIcon } from './Icons';

interface ProductSearchModalProps {
  onImageSelect: (imageUrl: string) => void;
  onClose: () => void;
}

const ProductCard: React.FC<{ product: StoreProduct; onSelect: (url: string) => void }> = ({ product, onSelect }) => (
  <button
    onClick={() => onSelect(product.imageUrl)}
    className="block group w-full text-left bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-pink-400 hover:shadow-md transition-all duration-200 flex flex-col"
  >
    <div className="w-full h-48 bg-white overflow-hidden">
      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    </div>
    <div className="p-3 flex-grow flex flex-col justify-between">
      <p className="text-sm font-medium text-gray-700 truncate" title={product.name}>{product.name}</p>
      <div>
        {product.sku && <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>}
        {product.barcode && <p className="text-xs text-gray-500 truncate">Barras: {product.barcode}</p>}
      </div>
    </div>
  </button>
);


export const ProductSearchModal: React.FC<{ onImageSelect: (imageUrl: string) => void; onClose: () => void }> = ({ onImageSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fix: The return type of `setTimeout` in the browser is `number`, not `NodeJS.Timeout`.
  // `ReturnType<typeof setTimeout>` correctly infers the type in any JS environment.
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const products = await searchProducts(searchQuery);
      setResults(products);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Credenciais da API')) {
        setError('Conexão com a loja não configurada. Peça ao administrador para configurar as credenciais do Shopify no servidor.');
      } else {
        setError('Falha ao buscar produtos. Verifique a conexão e tente novamente.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Carregamento inicial de produtos recentes
    handleSearch('');
  }, []);

  useEffect(() => {
    // Limpa o timeout anterior sempre que a query muda
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Define um novo timeout para buscar após o usuário parar de digitar
    debounceTimeout.current = setTimeout(() => {
      // Evita buscar com a mesma query do carregamento inicial se o campo for limpo
      if (query !== '') {
        handleSearch(query);
      } else if (results.length > 0 && query === '') {
        // Se o usuário limpar o campo, recarrega os produtos recentes
        handleSearch('');
      }
    }, 400); // 400ms de atraso

    // Função de limpeza para remover o timeout se o componente for desmontado
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]); // Executa o efeito sempre que a 'query' mudar

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl h-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Buscar Produto na Loja</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full" aria-label="Fechar">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome do produto..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
            autoFocus
          />
        </div>

        <div className="flex-grow overflow-y-auto -mr-3 pr-3">
          {isLoading ? (
             <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Carregando produtos...</p>
             </div>
          ) : error ? (
             <div className="flex items-center justify-center h-full">
                <p className="text-red-500">{error}</p>
             </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map(product => (
                <ProductCard key={product.id} product={product} onSelect={onImageSelect} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
               <p className="text-gray-500">Nenhum produto encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};