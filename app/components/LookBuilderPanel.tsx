import React from 'react';
import { ImageUploader } from './ImageUploader';
import { XIcon } from './Icons';

const ImagePreview = ({ src, onRemove }) => (
    <div className="relative group w-full aspect-square">
        <img src={src} alt="Preview of clothing" className="w-full h-full object-cover rounded-lg border border-gray-200" />
        <button
            onClick={onRemove}
            className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            aria-label={`Remover imagem`}
        >
            <XIcon className="w-4 h-4" />
        </button>
    </div>
);


const UploadSlot = ({ part, label, image, onUpload, onRemove }) => {
    return (
        <div className="flex flex-col gap-2 h-full">
            <p className="text-center text-sm font-medium text-gray-600">{label}</p>
            <div className="flex-grow">
                {image ? (
                    <ImagePreview src={image} onRemove={() => onRemove(part)} />
                ) : (
                    <ImageUploader onImageUpload={(file) => onUpload(part, file)} className="h-full" />
                )}
            </div>
        </div>
    );
};


export const LookBuilderPanel = ({
  uploadMode,
  setUploadMode,
  clothingImages,
  onImageUpload,
  onRemoveImage,
}) => {

  const TabButton = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`w-full py-2.5 text-sm font-semibold rounded-md transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col h-full">
      <div className="grid grid-cols-2 gap-2 mb-4">
        <TabButton active={uploadMode === 'separate'} onClick={() => setUploadMode('separate')}>Peças Separadas</TabButton>
        <TabButton active={uploadMode === 'combined'} onClick={() => setUploadMode('combined')}>Foto Única</TabButton>
      </div>

      {uploadMode === 'separate' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
          <UploadSlot 
            part="top"
            label="Parte Superior"
            image={clothingImages.top}
            onUpload={onImageUpload}
            onRemove={onRemoveImage}
          />
          <UploadSlot 
            part="bottom"
            label="Parte Inferior"
            image={clothingImages.bottom}
            onUpload={onImageUpload}
            onRemove={onRemoveImage}
          />
          <div className="md:col-span-2">
            <UploadSlot 
                part="shoes"
                label="Calçado (Opcional)"
                image={clothingImages.shoes}
                onUpload={onImageUpload}
                onRemove={onRemoveImage}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 flex-grow">
            <UploadSlot 
                part="combined"
                label="Look Completo"
                image={clothingImages.combined}
                onUpload={onImageUpload}
                onRemove={onRemoveImage}
            />
            <UploadSlot 
                part="shoes"
                label="Calçado (Opcional)"
                image={clothingImages.shoes}
                onUpload={onImageUpload}
                onRemove={onRemoveImage}
            />
        </div>
      )}
    </div>
  );
};
