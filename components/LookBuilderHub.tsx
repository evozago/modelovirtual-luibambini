
import React from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { ClothingImagesState } from '../types';
import { LookBuilderIcon } from './Icons';

interface LookBuilderHubProps {
  onClick: () => void;
}

export const LookBuilderHub: React.FC<LookBuilderHubProps> = ({ onClick }) => {
  const [clothingImages] = usePersistentState<ClothingImagesState>('lui-bambini-look-builder', { top: null, bottom: null, shoes: null, combined: null });

  const selectedCount = Object.values(clothingImages).filter(Boolean).length;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-110"
      aria-label="Abrir montador de looks"
    >
      {selectedCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full">
          {selectedCount}
        </span>
      )}
      <LookBuilderIcon className="w-8 h-8 mx-auto" />
    </button>
  );
};
