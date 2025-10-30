import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ProcessingView } from './components/ProcessingView';
import { ResultsCard } from './components/ResultsCard';
import { LogoIcon, GithubIcon } from './components/Icons';
import { processImage, generateDescription, generateModelImage, editImage } from './services/geminiService';
import { combineImages, fileToBase64 } from './utils/fileUtils';
import type { ProcessingState, ProductOutput, GenerationOptions } from './types';
import { ProcessingStep, Gender, Age, Theme, PieceCount } from './types';
import { GenerationOptionsForm } from './components/GenerationOptionsForm';
import { ImageEditor } from './components/ImageEditor';
import { ProductSearchModal } from './components/ProductSearchModal';

type ClothingPart = 'top' | 'bottom' | 'shoes' | 'combined';

export default function App() {
  const [uploadMode, setUploadMode] = useState<'separate' | 'combined'>('separate');
  const [clothingImages, setClothingImages] = useState<{ top: File | null; bottom: File | null; shoes: File | null; combined: File | null }>({ top: null, bottom: null, shoes: null, combined: null });
  const [processingState, setProcessingState] = useState<ProcessingState>({ step: ProcessingStep.IDLE });
  const [productOutput, setProductOutput] = useState<ProductOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<Omit<GenerationOptions, 'pieceCount'>>({
    gender: Gender.FEMALE,
    age: Age.FOUR_TO_EIGHT,
    theme: Theme.CASUAL,
    background: '',
  });
  const [productSearchTarget, setProductSearchTarget] = useState<ClothingPart | null>(null);


  const handleImageUpload = (part: ClothingPart, file: File) => {
    setClothingImages(prev => ({ ...prev, [part]: file }));
    setProductOutput(null);
    setError(null);
    setProcessingState({ step: ProcessingStep.IDLE });
    setIsEditing(false);
  };

  const handleImageFromUrl = useCallback(async (url: string) => {
    if (!productSearchTarget) return;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const filename = url.substring(url.lastIndexOf('/') + 1).split('?')[0] || 'product-image.jpg';
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        handleImageUpload(productSearchTarget, file);
    } catch (err) {
        console.error("Error fetching image from URL:", err);
        setError("Não foi possível carregar a imagem do produto. Verifique o link ou a conexão.");
    } finally {
        setProductSearchTarget(null); // Close modal
    }
  }, [productSearchTarget]);

  const handleReset = () => {
    setClothingImages({ top: null, bottom: null, shoes: null, combined: null });
    setProductOutput(null);
    setError(null);
    setProcessingState({ step: ProcessingStep.IDLE });
    setIsEditing(false);
  };
  
  const handleProcessImage = useCallback(async () => {
    let filesToProcess: File[] = [];
    if (uploadMode === 'separate') {
        if (!clothingImages.top || !clothingImages.bottom) return;
        filesToProcess = [clothingImages.top, clothingImages.bottom, clothingImages.shoes].filter((f): f is File => f !== null);
    } else { // 'combined' mode
        if (!clothingImages.combined) return;
        filesToProcess = [clothingImages.combined, clothingImages.shoes].filter((f): f is File => f !== null);
    }
    
    if (filesToProcess.length === 0) return;

    setError(null);
    setProductOutput(null);

    try {
      setProcessingState({ step: ProcessingStep.CLEANING });
      const referenceImageBase64s = await Promise.all(
        filesToProcess.map(file => fileToBase64(file))
      );
      
      const { combinedImageBase64, mimeType } = await combineImages(...filesToProcess);
      const cleanedImageBase64 = await processImage(combinedImageBase64, mimeType, PieceCount.SET);

      setProcessingState({ step: ProcessingStep.GENERATING_TEXT });
      const textGenOptions: GenerationOptions = { ...generationOptions, pieceCount: PieceCount.SET };
      const { description, command } = await generateDescription(cleanedImageBase64, textGenOptions);

      setProcessingState({ step: ProcessingStep.GENERATE_MODEL_IMAGE });
      const modelImageBase64 = await generateModelImage(
        cleanedImageBase64, 
        command,
        referenceImageBase64s
      );

      setProductOutput({
        cleanedImage: `data:image/png;base64,${cleanedImageBase64}`,
        modelImage: `data:image/png;base64,${modelImageBase64}`,
        description,
        continuationCommand: command,
      });
      setProcessingState({ step: ProcessingStep.DONE });
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao processar as imagens. Por favor, tente novamente.');
      setProcessingState({ step: ProcessingStep.ERROR });
    }
  }, [clothingImages, generationOptions, uploadMode]);

  const handleEditImage = useCallback(async (maskBase64: string, editPrompt: string) => {
    if (!productOutput) return;

    setIsEditing(false); // Hide the editor and show the processing view
    setError(null);
    try {
        setProcessingState({ step: ProcessingStep.EDITING });
        const editedImageBase64 = await editImage(
            productOutput.modelImage.split(',')[1],
            maskBase64,
            editPrompt
        );
        
        setProductOutput(prev => prev ? ({
            ...prev,
            modelImage: `data:image/png;base64,${editedImageBase64}`,
        }) : null);
        
        setProcessingState({ step: ProcessingStep.DONE });
    } catch (err) {
        console.error(err);
        setError('Ocorreu um erro ao editar a imagem. Por favor, tente novamente.');
        setProcessingState({ step: ProcessingStep.ERROR });
    }
}, [productOutput]);

  const openProductSearch = (target: ClothingPart) => {
    setProductSearchTarget(target);
  };

  const renderContent = () => {
    const isProcessing = ![ProcessingStep.IDLE, ProcessingStep.DONE, ProcessingStep.ERROR].includes(processingState.step);

    const containerClasses = "bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 flex flex-col h-full";

    if (isProcessing) {
      return <div className={containerClasses}><ProcessingView state={processingState} /></div>;
    }
    if (isEditing && productOutput) {
      return <div className={containerClasses}><ImageEditor image={productOutput.modelImage} onCancel={() => setIsEditing(false)} onSubmit={handleEditImage} /></div>;
    }
    if (productOutput) {
      return <ResultsCard output={productOutput} onReset={handleReset} onStartEdit={() => setIsEditing(true)} />;
    }
    
    let isButtonDisabled = true;
    if (uploadMode === 'separate') {
        isButtonDisabled = !clothingImages.top || !clothingImages.bottom;
    } else {
        isButtonDisabled = !clothingImages.combined;
    }

    return (
      <div className={containerClasses}>
        <div className="flex flex-col items-center justify-center h-full text-center flex-grow">
          <GenerationOptionsForm
            options={generationOptions}
            setOptions={setGenerationOptions}
            isSetCreationMode={true}
          />
        </div>
        <div className="w-full mt-auto">
            <button
              onClick={handleProcessImage}
              disabled={isButtonDisabled}
              className="w-full bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
            >
              Criar Look com IA
            </button>
            <button onClick={handleReset} className="mt-4 text-sm text-gray-500 hover:text-gray-700 w-full">
              Escolher outras imagens
            </button>
        </div>
      </div>
    );
  }
  
  const hasAnyImage = clothingImages.top || clothingImages.bottom || clothingImages.shoes || clothingImages.combined;

  const renderSeparatePreviews = () => (
    <>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Parte Superior</h2>
        <div className="w-full h-[30vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.top ? (
            <img src={URL.createObjectURL(clothingImages.top)} alt="Parte Superior" className="rounded-lg max-w-full max-h-full object-contain"/>
          ) : (
            <div className="w-full h-full"><ImageUploader onImageUpload={(file) => handleImageUpload('top', file)} onOpenProductSearch={() => openProductSearch('top')} /></div>
          )}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Parte Inferior</h2>
        <div className="w-full h-[30vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.bottom ? (
            <img src={URL.createObjectURL(clothingImages.bottom)} alt="Parte Inferior" className="rounded-lg max-w-full max-h-full object-contain"/>
          ) : (
            <div className="w-full h-full"><ImageUploader onImageUpload={(file) => handleImageUpload('bottom', file)} onOpenProductSearch={() => openProductSearch('bottom')} /></div>
          )}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Calçado (Opcional)</h2>
        <div className="w-full h-[30vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.shoes ? (
            <img src={URL.createObjectURL(clothingImages.shoes)} alt="Calçado" className="rounded-lg max-w-full max-h-full object-contain"/>
          ) : (
            <div className="w-full h-full"><ImageUploader onImageUpload={(file) => handleImageUpload('shoes', file)} onOpenProductSearch={() => openProductSearch('shoes')} /></div>
          )}
        </div>
      </div>
    </>
  );

  const renderCombinedPreviews = () => (
    <>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Look Completo</h2>
        <div className="w-full h-[45vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.combined ? (
            <img src={URL.createObjectURL(clothingImages.combined)} alt="Look Completo" className="rounded-lg max-w-full max-h-full object-contain"/>
          ) : (
            <div className="w-full h-full"><ImageUploader onImageUpload={(file) => handleImageUpload('combined', file)} onOpenProductSearch={() => openProductSearch('combined')} /></div>
          )}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Calçado (Opcional)</h2>
        <div className="w-full h-[45vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.shoes ? (
            <img src={URL.createObjectURL(clothingImages.shoes)} alt="Calçado" className="rounded-lg max-w-full max-h-full object-contain"/>
          ) : (
            <div className="w-full h-full"><ImageUploader onImageUpload={(file) => handleImageUpload('shoes', file)} onOpenProductSearch={() => openProductSearch('shoes')} /></div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-7xl mx-auto flex flex-col items-center flex-grow">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-2">
            <LogoIcon />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
              <span style={{ color: '#54c5c1' }}>Lui</span> <span style={{ color: '#e8a1b3' }}>Bambini</span> iA Editor
            </h1>
          </div>
          <p className="text-lg text-gray-600">
           Crie looks incríveis combinando peças para gerar modelos com IA.
          </p>
        </header>

        <div className="w-full flex-grow">
          {!hasAnyImage ? (
            <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
                <div className="flex justify-center mb-6 border-b border-gray-200">
                  <button onClick={() => setUploadMode('separate')} className={`px-4 py-2 text-lg font-medium transition-colors duration-200 ${uploadMode === 'separate' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    Peças Separadas
                  </button>
                  <button onClick={() => setUploadMode('combined')} className={`px-4 py-2 text-lg font-medium transition-colors duration-200 ${uploadMode === 'combined' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    Foto Única do Look
                  </button>
                </div>
                {uploadMode === 'separate' ? (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div><h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Parte Superior</h2><ImageUploader onImageUpload={(file) => handleImageUpload('top', file)} onOpenProductSearch={() => openProductSearch('top')} /></div>
                      <div><h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Parte Inferior</h2><ImageUploader onImageUpload={(file) => handleImageUpload('bottom', file)} onOpenProductSearch={() => openProductSearch('bottom')} /></div>
                      <div><h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Calçado (Opcional)</h2><ImageUploader onImageUpload={(file) => handleImageUpload('shoes', file)} onOpenProductSearch={() => openProductSearch('shoes')} /></div>
                   </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div><h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Look Completo</h2><ImageUploader onImageUpload={(file) => handleImageUpload('combined', file)} onOpenProductSearch={() => openProductSearch('combined')} /></div>
                    <div><h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Calçado (Opcional)</h2><ImageUploader onImageUpload={(file) => handleImageUpload('shoes', file)} onOpenProductSearch={() => openProductSearch('shoes')} /></div>
                  </div>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="w-full flex flex-col bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 gap-y-6">
                {uploadMode === 'separate' ? renderSeparatePreviews() : renderCombinedPreviews()}
              </div>

              <div className="w-full flex flex-col h-full">
                 {renderContent()}
                 {error && <div className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</div>}
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="w-full max-w-7xl mx-auto text-center text-gray-500 text-sm mt-8">
        <div className="flex flex-col items-center gap-2">
            <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-pink-600 transition-colors">
                <GithubIcon />
            </a>
            <p>Copyright © 2025 - Lui Bambini Todos direitos Reservados</p>
        </div>
      </footer>
      {productSearchTarget && (
        <ProductSearchModal
          onImageSelect={handleImageFromUrl}
          onClose={() => setProductSearchTarget(null)}
        />
      )}
    </div>
  );
}