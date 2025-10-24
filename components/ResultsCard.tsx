import React, { useState } from 'react';
import type { ProductOutput } from '../types';
import { CopyIcon, CheckIcon, RefreshIcon, DownloadIcon } from './Icons';

interface ResultsCardProps {
  output: ProductOutput;
  onReset: () => void;
}

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 bg-gray-700/50 text-white rounded-md hover:bg-gray-700/80 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Copiar para área de transferência"
        >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
        </button>
    );
};

export const ResultsCard: React.FC<ResultsCardProps> = ({ output, onReset }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = output.modelImage;
    link.download = 'imagem-gerada-ia.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="flex flex-col h-full animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Resultados da IA</h2>
            <div className="flex items-center gap-4">
              <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 text-sm bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                  <DownloadIcon className="w-4 h-4"/>
                  Baixar
              </button>
              <button
                  onClick={onReset}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                  title="Começar de Novo"
              >
                  <RefreshIcon className="w-4 h-4"/>
                  Novo
              </button>
            </div>
        </div>

      <div className="flex flex-col gap-4">
        <div className="text-center p-4 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">Modelo Gerado com IA</h3>
            <img src={output.modelImage} alt="AI Generated Model" className="max-h-60 mx-auto object-contain rounded" />
        </div>

        <div className="relative group">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Descrição Curta</label>
            <p className="mt-1 p-3 bg-gray-100 text-gray-800 rounded-md text-base">{output.description}</p>
            <CopyButton textToCopy={output.description} />
        </div>

        <div className="relative group">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Comando de Continuação</label>
            <p className="mt-1 p-3 bg-gray-100 text-gray-800 rounded-md text-sm leading-relaxed">{output.continuationCommand}</p>
            <CopyButton textToCopy={output.continuationCommand} />
        </div>

        <div className="text-center p-2 bg-gray-100 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Imagem Limpa (Referência)</h3>
            <img src={output.cleanedImage} alt="Cleaned Product" className="max-h-20 mx-auto object-contain rounded" />
        </div>
      </div>
    </div>
  );
};