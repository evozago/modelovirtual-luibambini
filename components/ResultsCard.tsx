import React, { useState } from 'react';
import type { ProductOutput } from '../types';
import { CopyIcon, CheckIcon, RefreshIcon, DownloadIcon, BrushIcon, XIcon, InfoIcon } from './Icons';

interface ResultsCardProps {
  output: ProductOutput;
  onReset: () => void;
  onStartEdit: () => void;
}

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300 hover:text-gray-900 transition-all"
            aria-label="Copiar para área de transferência"
        >
            {copied ? <CheckIcon className="w-4 h-4 text-indigo-600" /> : <CopyIcon className="w-4 h-4" />}
        </button>
    );
};

export const ResultsCard: React.FC<ResultsCardProps> = ({ output, onReset, onStartEdit }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = output.modelImage;
    link.download = 'imagem-gerada-ia.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 flex flex-col h-full animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Resultado Gerado pela IA</h2>
            <button
                onClick={onReset}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                title="Começar de Novo"
            >
                <RefreshIcon className="w-4 h-4"/>
                <span>Novo</span>
            </button>
        </div>

        {/* Main Image Viewer */}
        <div className="w-full h-[55vh] flex items-center justify-center bg-gray-100 rounded-lg mb-4">
            <button onClick={() => setIsModalOpen(true)} className="w-full h-full cursor-pointer group focus:outline-none" title="Clique para ampliar">
              <img 
                src={output.modelImage} 
                alt="AI Generated Model" 
                className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
              />
            </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
            <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 text-sm bg-indigo-600 text-white font-semibold py-3 px-3 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
                <DownloadIcon className="w-5 h-5"/>
                Baixar Imagem
            </button>
            <button
                onClick={onStartEdit}
                className="flex items-center justify-center gap-2 text-sm bg-gray-200 text-gray-800 font-semibold py-3 px-3 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all duration-200"
            >
                <BrushIcon className="w-5 h-5"/>
                Editar com IA
            </button>
        </div>

        {/* Details Section */}
        <div className="flex flex-col gap-4 mt-auto border-t border-gray-200 pt-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-grow">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição Curta</label>
                <p className="mt-1 text-gray-800 text-base">{output.description}</p>
              </div>
              <CopyButton textToCopy={output.description} />
            </div>

            <div className="flex justify-between items-start gap-4">
              <div className="flex-grow">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comando de Continuação</label>
                <p className="mt-1 text-gray-600 text-sm leading-relaxed">{output.continuationCommand}</p>
              </div>
               <CopyButton textToCopy={output.continuationCommand} />
            </div>
        
            <div className="mt-2 group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                Imagem de Referência
                <span className="relative">
                  <InfoIcon className="w-4 h-4 text-gray-400" />
                  <span className="absolute bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 left-1/2 -translate-x-1/2 pointer-events-none">
                    Esta foi a imagem usada pela IA para gerar o texto e vestir a modelo.
                  </span>
                </span>
              </label>
              <div className="mt-2 p-2 bg-gray-100 rounded-md inline-block">
                <img src={output.cleanedImage} alt="Cleaned Product" className="h-16 w-16 object-contain rounded" />
              </div>
            </div>
        </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative bg-white rounded-lg shadow-xl p-4 max-w-4xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full z-10"
              aria-label="Fechar"
            >
              <XIcon className="w-6 h-6" />
            </button>
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={output.modelImage} 
                alt="AI Generated Model - Preview" 
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
