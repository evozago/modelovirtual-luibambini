import React, { useCallback, useState } from 'react';
import { UploadIcon } from './Icons';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  onOpenProductSearch?: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, onOpenProductSearch }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageUpload(event.target.files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);
  
  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImageUpload(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onImageUpload]);

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full h-64 sm:h-80 border-2 border-dashed rounded-lg transition-colors duration-200 ${
        isDragging ? 'border-pink-500 bg-pink-50' : 'border-gray-300 bg-gray-50'
      }`}
    >
      <div className="text-center p-8">
        <div className="flex justify-center mb-4">
            <UploadIcon className={`w-12 h-12 transition-colors ${isDragging ? 'text-pink-600' : 'text-gray-400'}`} />
        </div>
        <p className="text-xl font-semibold text-gray-700">Arraste e solte uma imagem aqui</p>
        <p className="text-gray-500 mt-1">ou</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-4 justify-center">
          <label
            htmlFor="file-upload"
            className="cursor-pointer rounded-md bg-white px-4 py-2 text-sm font-semibold text-pink-600 ring-1 ring-inset ring-pink-300 hover:bg-pink-50"
          >
            Selecione um arquivo
          </label>
          {onOpenProductSearch && (
              <button
                  type="button"
                  onClick={onOpenProductSearch}
                  className="rounded-md bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-600 ring-1 ring-inset ring-pink-300 hover:bg-pink-100"
              >
                  Buscar na Loja
              </button>
          )}
        </div>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          accept="image/png, image/jpeg"
          onChange={handleFileChange}
        />
         <p className="text-xs text-gray-400 mt-4">PNG, JPG</p>
      </div>
    </div>
  );
};