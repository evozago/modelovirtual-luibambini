
import React from 'react';
import { ClothingImagesState } from '../types';
import { ImageUploader } from './ImageUploader';
import { XIcon } from './Icons';

interface LookBuilderPanelProps {
  uploadMode: 'separate' | 'combined';
  setUploadMode: (mode: 'separate' | 'combined') => void;
  clothingImages: ClothingImagesState;
  onImageUpload: (part: keyof ClothingImagesState, file: File) => void;
  onRemoveImage: (part: keyof ClothingImagesState) => void;
}

const ImagePreview: React.FC<{ src: string; onRemove: () => void; label: string }> = ({ src, onRemove, label }) => (
    <div className="relative group w-full">
        <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
        <div className="relative aspect-square w-full">
            <img src={src} alt={`Preview of ${label}`} className="w-full h-full object-cover rounded-lg border border-gray-200" />
            <button
                onClick={onRemove}
                className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                aria-label={`Remover ${label}`}
            >
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);


export const LookBuilderPanel: React.FC<LookBuilderPanelProps> = ({
  uploadMode,
  setUploadMode,
  clothingImages,
  onImageUpload,
  onRemoveImage,
}) => {

  const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`w-full py-2.5 text-sm font-semibold rounded-md transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {children}
    </button>
  );
  
  const hasAnyImage = Object.values(clothingImages).some(img => img !== null);

  if (hasAnyImage) {
      return (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col h-full space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-3">Seu Look Atual</h3>
              {clothingImages.combined && <ImagePreview src={clothingImages.combined} onRemove={() => onRemoveImage('combined')} label="Look Completo" />}
              {clothingImages.top && <ImagePreview src={clothingImages.top} onRemove={() => onRemoveImage('top')} label="Parte Superior" />}
              {clothingImages.bottom && <ImagePreview src={clothingImages.bottom} onRemove={() => onRemoveImage('bottom')} label="Parte Inferior" />}
              {clothingImages.shoes && <ImagePreview src={clothingImages.shoes} onRemove={() => onRemoveImage('shoes')} label="Calçado" />}
          </div>
      )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col h-full">
      <div className="grid grid-cols-2 gap-2 mb-4">
        <TabButton active={uploadMode === 'separate'} onClick={() => setUploadMode('separate')}>Peças Separadas</TabButton>
        <TabButton active={uploadMode === 'combined'} onClick={() => setUploadMode('combined')}>Foto Única</TabButton>
      </div>

      {uploadMode === 'separate' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
          <div className="flex flex-col gap-4">
            <ImageUploader onImageUpload={(file) => onImageUpload('top', file)} className="h-full" />
            <p className="text-center text-sm font-medium text-gray-600">Parte Superior</p>
          </div>
          <div className="flex flex-col gap-4">
            <ImageUploader onImageUpload={(file) => onImageUpload('bottom', file)} className="h-full" />
            <p className="text-center text-sm font-medium text-gray-600">Parte Inferior</p>
          </div>
          <div className="md:col-span-2 flex flex-col gap-4">
            <ImageUploader onImageUpload={(file) => onImageUpload('shoes', file)} className="h-full" />
            <p className="text-center text-sm font-medium text-gray-600">Calçado (Opcional)</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-grow">
            <div className="flex-grow">
                <ImageUploader onImageUpload={(file) => onImageUpload('combined', file)} className="h-full" />
                <p className="text-center text-sm font-medium text-gray-600 mt-4">Look Completo</p>
            </div>
            <div className="flex-grow">
                <ImageUploader onImageUpload={(file) => onImageUpload('shoes', file)} className="h-full" />
                <p className="text-center text-sm font-medium text-gray-600 mt-4">Calçado (Opcional)</p>
            </div>
        </div>
      )}
    </div>
  );
};
