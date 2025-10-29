
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ProcessingView } from './components/ProcessingView';
import { ResultsCard } from './components/ResultsCard';
import { LogoIcon, GithubIcon } from './components/Icons';
import { processImage, generateDescription, generateModelImage, editImage } from './services/geminiService';
import { combineImages, urlToDataUrl } from './utils/fileUtils';
import type { ProcessingState, ProductOutput, GenerationOptions, ClothingImagesState } from './types';
import { ProcessingStep, Gender, Age, Theme, PieceCount } from './types';
import { GenerationOptionsForm } from './components/GenerationOptionsForm';
import { ImageEditor } from './components/ImageEditor';
import { usePersistentState } from './hooks/usePersistentState';
import { LookBuilderPanel } from './components/LookBuilderPanel';
import { LookBuilderHub } from './components/LookBuilderHub';
import { Modal } from './components/Modal';
import { useAppBridge } from '@shopify/app-bridge-react';


// This sub-component safely calls the Shopify hook.
const ShopifyConnectionStatus = () => {
    // This hook will only be called when the component is rendered,
    // and we'll only render it if we're in a Shopify context.
    const appBridge = useAppBridge();
    return (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full shadow z-50">
          Conectado à loja Shopify...
        </div>
    );
};


export default function App() {
  const [uploadMode, setUploadMode] = usePersistentState<'separate' | 'combined'>('lui-bambini-upload-mode', 'separate');
  const [clothingImages, setClothingImages] = usePersistentState<ClothingImagesState>('lui-bambini-look-builder', { top: null, bottom: null, shoes: null, combined: null });

  const [processingState, setProcessingState] = useState<ProcessingState>({ step: ProcessingStep.IDLE });
  const [productOutput, setProductOutput] = useState<ProductOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // Safely check if we are in a Shopify context by looking at URL params
  const isInShopifyContext = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('host') && params.get('shop');
  }, []);


  const [generationOptions, setGenerationOptions] = useState<Omit<GenerationOptions, 'pieceCount'>>({
    gender: Gender.FEMALE,
    age: Age.FOUR_TO_EIGHT,
    theme: Theme.CASUAL,
    background: '',
  });

  const handleImageUpload = async (part: keyof ClothingImagesState, file: File) => {
    const dataUrl = await urlToDataUrl(URL.createObjectURL(file));
    setClothingImages(prev => ({ ...prev, [part]: dataUrl }));
    setProductOutput(null);
    setError(null);
    setProcessingState({ step: ProcessingStep.IDLE });
    setIsEditing(false);
  };

  const handleRemoveImage = (part: keyof ClothingImagesState) => {
    setClothingImages(prev => ({...prev, [part]: null}));
  };

  const handleProcessImage = useCallback(async () => {
    let imagesToProcess: string[] = [];
    if (uploadMode === 'separate') {
        if (!clothingImages.top || !clothingImages.bottom) return;
        imagesToProcess = [clothingImages.top, clothingImages.bottom, clothingImages.shoes].filter((img): img is string => img !== null);
    } else { // 'combined' mode
        if (!clothingImages.combined) return;
        imagesToProcess = [clothingImages.combined, clothingImages.shoes].filter((img): img is string => img !== null);
    }
    
    if (imagesToProcess.length === 0) return;

    setError(null);
    setProductOutput(null);

    try {
      setProcessingState({ step: ProcessingStep.CLEANING });
      const { combinedImageBase64, mimeType } = await combineImages(...imagesToProcess);
      
      setProcessingState({ step: ProcessingStep.CLEANING });
      const cleanedImageBase64 = await processImage(combinedImageBase64, mimeType, PieceCount.SET);

      setProcessingState({ step: ProcessingStep.GENERATING_TEXT });
      const textGenOptions: GenerationOptions = { ...generationOptions, pieceCount: PieceCount.SET };
      const { description, command } = await generateDescription(`data:image/png;base64,${cleanedImageBase64}`, textGenOptions);

      setProcessingState({ step: ProcessingStep.GENERATE_MODEL_IMAGE });
      const modelImageBase64 = await generateModelImage(
        `data:image/png;base64,${cleanedImageBase64}`, 
        command,
        imagesToProcess // Pass the original data URLs
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
            productOutput.modelImage,
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

  const renderContent = () => {
    const isProcessing = ![ProcessingStep.IDLE, ProcessingStep.DONE, ProcessingStep.ERROR].includes(processingState.step);
    const hasAnyImage = Object.values(clothingImages).some(img => img !== null);
    const containerClasses = "bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 flex flex-col h-full";

    if (!hasAnyImage) {
      return (
        <div className={containerClasses}>
            <div className="flex flex-col items-center justify-center text-center h-full">
                <div className="flex justify-center mb-4"><LogoIcon /></div>
                <h2 className="text-xl font-semibold text-gray-800">Seu Montador de Looks está Vazio</h2>
                <p className="text-gray-600 mt-2 max-w-sm">Navegue pela loja e clique em "Adicionar ao Look" nos produtos, ou faça o upload das suas próprias imagens aqui para começar.</p>
            </div>
        </div>
      );
    }
    
    if (isProcessing) {
      return <div className={containerClasses}><ProcessingView state={processingState} /></div>;
    }
    if (isEditing && productOutput) {
      return <div className={containerClasses}><ImageEditor image={productOutput.modelImage} onCancel={() => setIsEditing(false)} onSubmit={handleEditImage} /></div>;
    }
    if (productOutput) {
      return <ResultsCard output={productOutput} onReset={() => setProductOutput(null)} onStartEdit={() => setIsEditing(true)} />;
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
              className="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
            >
              Criar Look com IA
            </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center">
       {isInShopifyContext && <ShopifyConnectionStatus />}

      <LookBuilderHub onClick={() => setIsEditorOpen(true)} />
      
      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title="Montador de Looks com IA">
        <main className="w-full flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <LookBuilderPanel 
              uploadMode={uploadMode}
              setUploadMode={setUploadMode}
              clothingImages={clothingImages}
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
          />
          <div className="w-full flex flex-col h-full">
              {renderContent()}
              {error && <div className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</div>}
          </div>
        </main>
      </Modal>

      <footer className="w-full max-w-7xl mx-auto text-center text-gray-500 text-sm mt-8 pb-8">
        <div className="flex flex-col items-center gap-2">
            <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-indigo-600 transition-colors">
                <GithubIcon />
            </a>
            <p>Copyright © 2025 - Lui Bambini Todos direitos Reservados</p>
        </div>
      </footer>
    </div>
  );
}