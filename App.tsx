

import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ProcessingView } from './components/ProcessingView';
import { ResultsCard } from './components/ResultsCard';
import { WebsiteIcon, InstagramIcon, WhatsAppIcon, MapPinIcon, XIcon, SparklesIcon, CameraIcon, PersonIcon } from './components/Icons';
import { processImage, generateDescription, generateModelImage, editImage, generateVideo } from './services/geminiService';
import { combineImages, fileToBase64 } from './utils/fileUtils';
import type { ProcessingState, ProductOutput, GenerationOptions, AppMode } from './types';
import { ProcessingStep, Gender, Age, Theme, PieceCount } from './types';
import { GenerationOptionsForm } from './components/GenerationOptionsForm';
import { ImageEditor } from './components/ImageEditor';
import { ProductSearchModal } from './components/ProductSearchModal';
import { VirtualFittingRoom } from './components/VirtualFittingRoom';

type ClothingPart = 'top' | 'bottom' | 'shoes' | 'combined';

const getGeminiErrorMessage = (error: unknown): string => {
  const defaultMessage = 'Ocorreu um erro ao processar a imagem. Por favor, tente novamente.';

  if (error instanceof Error) {
    // O erro do SDK pode vir como uma string JSON.
    // Verificamos as frases mais críticas primeiro.
    if (error.message.includes('leaked')) {
      return 'Sua chave de API foi bloqueada por motivos de segurança. Por favor, gere uma nova chave de API no Google AI Studio.';
    }
    if (error.message.includes('API key not valid')) {
      return 'A chave de API fornecida não é válida. Verifique se a chave está correta no seu ambiente.';
    }
    if (error.message.includes('expired')) {
        return 'Sua chave de API expirou. Por favor, gere uma nova chave de API no Google AI Studio.';
    }
    if (error.message.includes('Requested entity was not found')) {
      return 'A chave de API selecionada parece ser inválida ou não tem as permissões necessárias para esta operação.';
    }

    // Tenta analisar o erro para uma mensagem mais específica da API.
    try {
      const errorJson = JSON.parse(error.message);
      const apiMessage = errorJson?.error?.message;
      if (apiMessage) {
        return `Erro da IA: ${apiMessage}`;
      }
    } catch (e) {
      // Não é um erro JSON, retorna a mensagem de erro simples.
      return error.message;
    }
    // Era um erro JSON, mas sem a estrutura esperada, retorna a mensagem original.
    return error.message;
  }

  return defaultMessage;
};

// Componente para solicitar a seleção da chave de API, agora dentro do App.tsx para evitar a criação de novos arquivos.
const ApiKeyPrompt: React.FC<{
  onSelectKey: () => void;
  onCancel: () => void;
  errorMessage?: string | null;
}> = ({ onSelectKey, onCancel, errorMessage }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full p-4 bg-teal-50 rounded-lg animate-fade-in">
      <div className="relative w-16 h-16 mb-4">
        <div className="relative flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full">
          <SparklesIcon className="w-8 h-8 text-teal-500" />
        </div>
      </div>
      <h2 className="text-xl font-semibold text-gray-800">API Key Necessária para Vídeo</h2>
      <p className="text-gray-600 mt-2 max-w-md">
        A geração de vídeo com o modelo Veo é um recurso avançado. Para continuar, por favor, selecione uma API key de um projeto com faturamento ativado.
      </p>
      {errorMessage && (
        <p className="mt-4 text-sm text-red-600 bg-red-100 p-2 rounded-md">{errorMessage}</p>
      )}
      <a 
        href="https://ai.google.dev/gemini-api/docs/billing" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-sm text-teal-600 hover:text-teal-800 mt-3 underline"
      >
        Saiba mais sobre o faturamento
      </a>
      <div className="flex gap-4 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSelectKey}
          className="px-6 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors"
        >
          Selecionar Chave de API
        </button>
      </div>
    </div>
  );
};


export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('studio'); // 'studio' | 'fitting-room'
  const [uploadMode, setUploadMode] = useState<'separate' | 'combined'>('separate');
  const [clothingImages, setClothingImages] = useState<{ top: File | null; bottom: File | null; shoes: File | null; combined: File | null }>({ top: null, bottom: null, shoes: null, combined: null });
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({ step: ProcessingStep.IDLE });
  const [productOutput, setProductOutput] = useState<ProductOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<Omit<GenerationOptions, 'pieceCount'>>({
    gender: Gender.FEMALE,
    age: Age.FOUR_TO_EIGHT,
    theme: Theme.CASUAL,
    background: '',
  });
  const [productSearchTarget, setProductSearchTarget] = useState<ClothingPart | null>(null);
  const [combinedPieceCount, setCombinedPieceCount] = useState<PieceCount>(PieceCount.SET);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);


  const handleImageUpload = (part: ClothingPart, file: File) => {
    setClothingImages(prev => ({ ...prev, [part]: file }));
    setProductOutput(null);
    setError(null);
    setProcessingState({ step: ProcessingStep.IDLE });
    setIsEditing(false);
  };

  const handleModelImageUpload = (file: File) => {
    setModelImage(file);
    setProductOutput(null);
    setError(null);
    setProcessingState({ step: ProcessingStep.IDLE });
    setIsEditing(false);
  };

  const handleRemoveImage = (part: ClothingPart) => {
    setClothingImages(prev => ({...prev, [part]: null}));
  };

  const handleRemoveModelImage = () => {
    setModelImage(null);
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
    setModelImage(null);
    setProductOutput(null);
    setError(null);
    setProcessingState({ step: ProcessingStep.IDLE });
    setIsEditing(false);
    setIsGeneratingVideo(false);
    setShowApiKeyPrompt(false);
    setApiKeyError(null);
  };
  
  const handleProcessImage = useCallback(async () => {
    let filesToProcess: File[] = [];
    let pieceCountForApi: PieceCount;

    if (uploadMode === 'separate') {
        if (!clothingImages.top || !clothingImages.bottom) return;
        filesToProcess = [clothingImages.top, clothingImages.bottom, clothingImages.shoes].filter((f): f is File => f !== null);
        pieceCountForApi = PieceCount.SET;
    } else { // 'combined' mode
        if (!clothingImages.combined) return;
        filesToProcess = [clothingImages.combined, clothingImages.shoes].filter((f): f is File => f !== null);
        pieceCountForApi = combinedPieceCount;
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
      const cleanedImageBase64 = await processImage(combinedImageBase64, mimeType, pieceCountForApi);

      setProcessingState({ step: ProcessingStep.GENERATING_TEXT });
      const textGenOptions: GenerationOptions = { ...generationOptions, pieceCount: pieceCountForApi };
      const { description, command, socialMediaPost } = await generateDescription(cleanedImageBase64, textGenOptions);

      setProcessingState({ step: ProcessingStep.GENERATE_MODEL_IMAGE });
      const modelPhotoBase64 = modelImage ? await fileToBase64(modelImage) : undefined;
      const modelImageBase64 = await generateModelImage(
        cleanedImageBase64, 
        command,
        referenceImageBase64s,
        modelPhotoBase64
      );

      setProductOutput({
        cleanedImage: `data:image/png;base64,${cleanedImageBase64}`,
        modelImage: `data:image/png;base64,${modelImageBase64}`,
        description,
        continuationCommand: command,
        socialMediaPost,
      });
      setProcessingState({ step: ProcessingStep.DONE });
    } catch (err) {
      console.error(err);
      const errorMessage = getGeminiErrorMessage(err);
      setError(errorMessage);
      setProcessingState({ step: ProcessingStep.ERROR });
    }
  }, [clothingImages, generationOptions, uploadMode, combinedPieceCount, modelImage]);

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
        const errorMessage = getGeminiErrorMessage(err);
        setError(errorMessage);
        setProcessingState({ step: ProcessingStep.ERROR });
    }
}, [productOutput]);

  const proceedWithVideoGeneration = useCallback(async () => {
    if (!productOutput) return;
    
    setShowApiKeyPrompt(false);
    setIsGeneratingVideo(true);
    setProcessingState({ step: ProcessingStep.GENERATING_VIDEO });
    setError(null);
    setApiKeyError(null);

    try {
        const generatedImageBase64 = productOutput.modelImage.split(',')[1];
        const downloadLink = await generateVideo(generatedImageBase64);

        const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_IA_API_KEY;
        if (!apiKey) {
            throw new Error("Chave de API não encontrada para buscar o vídeo.");
        }

        const response = await fetch(`${downloadLink}&key=${apiKey}`);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Falha ao baixar vídeo:", errorBody);
            if (response.status === 404 || errorBody.includes("NOT_FOUND")) {
                 throw new Error("Requested entity was not found.");
            }
            throw new Error(`Falha ao baixar o vídeo: ${response.statusText}`);
        }
        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        
        setProductOutput(prev => prev ? ({ ...prev, modelVideoUrl: videoUrl }) : null);
        setProcessingState({ step: ProcessingStep.DONE });

    } catch (err) {
        console.error(err);
        
        if (err instanceof Error && (err.message.includes("Requested entity was not found") || err.message.includes("NOT_FOUND"))) {
            setApiKeyError("A chave de API selecionada parece ser inválida ou não tem as permissões necessárias para gerar vídeos. Por favor, selecione outra chave.");
            setShowApiKeyPrompt(true);
            setProcessingState({ step: ProcessingStep.IDLE }); // Volta ao estado inicial para mostrar o prompt.
        } else {
            const errorMessage = getGeminiErrorMessage(err);
            setError(errorMessage);
            setProcessingState({ step: ProcessingStep.ERROR });
        }
    } finally {
        setIsGeneratingVideo(false);
    }
  }, [productOutput]);

  const handleGenerateVideo = useCallback(async () => {
    if (!productOutput) return;

    setApiKeyError(null);
    
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            setShowApiKeyPrompt(true);
            return;
        }
    } else {
        console.warn('aistudio API key selection not available. Proceeding with existing key.');
    }
    
    await proceedWithVideoGeneration();

  }, [productOutput, proceedWithVideoGeneration]);
  
  const handleSelectKeyAndGenerate = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
          await (window as any).aistudio.openSelectKey();
          await proceedWithVideoGeneration();
      }
  };

  const openProductSearch = (target: ClothingPart) => {
    setProductSearchTarget(target);
  };

  const renderContent = () => {
    const isProcessing = ![ProcessingStep.IDLE, ProcessingStep.DONE, ProcessingStep.ERROR].includes(processingState.step);

    const containerClasses = "bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 flex flex-col h-full";

    if (showApiKeyPrompt) {
      return (
          <div className={containerClasses}>
              <ApiKeyPrompt
                  onSelectKey={handleSelectKeyAndGenerate}
                  onCancel={() => {
                    setShowApiKeyPrompt(false);
                    // Reset processing state if user cancels
                    if(processingState.step === ProcessingStep.GENERATING_VIDEO) {
                      setProcessingState({step: ProcessingStep.DONE});
                    }
                  }}
                  errorMessage={apiKeyError}
              />
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
      return <ResultsCard output={productOutput} onReset={handleReset} onStartEdit={() => setIsEditing(true)} onGenerateVideo={handleGenerateVideo} isGeneratingVideo={isGeneratingVideo} />;
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
          <div className="w-full mb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4 text-left">Modelo (Opcional)</h2>
              <div className="w-full h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                  {modelImage ? (
                        <div className="relative w-full h-full group">
                          <img src={URL.createObjectURL(modelImage)} alt="Modelo" className="rounded-lg max-w-full max-h-full object-contain w-full h-full"/>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={handleRemoveModelImage} className="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" aria-label="Remover imagem da modelo">
                                  <XIcon className="w-5 h-5 text-gray-800"/>
                              </button>
                          </div>
                      </div>
                  ) : (
                      <div className="w-full h-full">
                          <ImageUploader onImageUpload={handleModelImageUpload} />
                      </div>
                  )}
              </div>
                <p className="text-xs text-gray-500 mt-2 text-left">Envie uma foto da criança para vesti-la com as roupas.</p>
          </div>
          <GenerationOptionsForm
            options={generationOptions}
            setOptions={setGenerationOptions}
            isSetCreationMode={uploadMode === 'separate'}
            isModelPhotoUploaded={!!modelImage}
          />
           {uploadMode === 'combined' && (
             <div className="w-full my-4">
                <label className="block text-sm font-medium text-gray-700 text-left mb-2">A foto contém:</label>
                <div className="flex gap-x-6 justify-start">
                    <div className="flex items-center">
                        <input
                            id="piece-count-set"
                            name="piece-count"
                            type="radio"
                            value={PieceCount.SET}
                            checked={combinedPieceCount === PieceCount.SET}
                            onChange={() => setCombinedPieceCount(PieceCount.SET)}
                            className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300"
                        />
                        <label htmlFor="piece-count-set" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                            {PieceCount.SET}
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            id="piece-count-single"
                            name="piece-count"
                            type="radio"
                            value={PieceCount.SINGLE}
                            checked={combinedPieceCount === PieceCount.SINGLE}
                            onChange={() => setCombinedPieceCount(PieceCount.SINGLE)}
                            className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300"
                        />
                        <label htmlFor="piece-count-single" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                            {PieceCount.SINGLE}
                        </label>
                    </div>
                </div>
            </div>
          )}
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
        <div className="w-full h-56 sm:h-[30vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.top ? (
            <div className="relative w-full h-full group">
                <img src={URL.createObjectURL(clothingImages.top)} alt="Parte Superior" className="rounded-lg max-w-full max-h-full object-contain w-full h-full"/>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleRemoveImage('top')} className="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" aria-label="Remover imagem">
                        <XIcon className="w-5 h-5 text-gray-800"/>
                    </button>
                </div>
            </div>
          ) : (
            <div className="w-full h-full"><ImageUploader onImageUpload={(file) => handleImageUpload('top', file)} onOpenProductSearch={() => openProductSearch('top')} /></div>
          )}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Parte Inferior</h2>
        <div className="w-full h-56 sm:h-[30vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.bottom ? (
            <div className="relative w-full h-full group">
                <img src={URL.createObjectURL(clothingImages.bottom)} alt="Parte Inferior" className="rounded-lg max-w-full max-h-full object-contain w-full h-full"/>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleRemoveImage('bottom')} className="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" aria-label="Remover imagem">
                        <XIcon className="w-5 h-5 text-gray-800"/>
                    </button>
                </div>
            </div>
          ) : (
            <div className="w-full h-full"><ImageUploader onImageUpload={(file) => handleImageUpload('bottom', file)} onOpenProductSearch={() => openProductSearch('bottom')} /></div>
          )}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Calçado (Opcional)</h2>
        <div className="w-full h-56 sm:h-[30vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.shoes ? (
            <div className="relative w-full h-full group">
                <img src={URL.createObjectURL(clothingImages.shoes)} alt="Calçado" className="rounded-lg max-w-full max-h-full object-contain w-full h-full"/>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleRemoveImage('shoes')} className="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" aria-label="Remover imagem">
                        <XIcon className="w-5 h-5 text-gray-800"/>
                    </button>
                </div>
            </div>
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
        <h2 className="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Foto Única do Look</h2>
        <div className="w-full h-64 sm:h-[45vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.combined ? (
             <div className="relative w-full h-full group">
                <img src={URL.createObjectURL(clothingImages.combined)} alt="Look Completo" className="rounded-lg max-w-full max-h-full object-contain w-full h-full"/>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleRemoveImage('combined')} className="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" aria-label="Remover imagem">
                        <XIcon className="w-5 h-5 text-gray-800"/>
                    </button>
                </div>
            </div>
          ) : (
            <div className="w-full h-full"><ImageUploader onImageUpload={(file) => handleImageUpload('combined', file)} onOpenProductSearch={() => openProductSearch('combined')} /></div>
          )}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Calçado (Opcional)</h2>
        <div className="w-full h-64 sm:h-[45vh] flex items-center justify-center bg-gray-50 rounded-lg">
          {clothingImages.shoes ? (
             <div className="relative w-full h-full group">
                <img src={URL.createObjectURL(clothingImages.shoes)} alt="Calçado" className="rounded-lg max-w-full max-h-full object-contain w-full h-full"/>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleRemoveImage('shoes')} className="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" aria-label="Remover imagem">
                        <XIcon className="w-5 h-5 text-gray-800"/>
                    </button>
                </div>
            </div>
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
        <header className="text-center mb-8 w-full">
          <div className="flex justify-center items-center gap-3 mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
              <span style={{ color: '#54c5c1' }}>Lui</span> <span style={{ color: '#e8a1b3' }}>Bambini</span> iA Editor
            </h1>
          </div>
          
          {/* Mode Switcher */}
          <div className="flex justify-center mt-6">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
                <button 
                    onClick={() => setAppMode('studio')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                        appMode === 'studio' 
                        ? 'bg-pink-100 text-pink-700 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <PersonIcon className="w-4 h-4" />
                        Estúdio de Criação
                    </div>
                </button>
                <button 
                    onClick={() => setAppMode('fitting-room')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                        appMode === 'fitting-room' 
                        ? 'bg-pink-100 text-pink-700 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                     <div className="flex items-center gap-2">
                        <CameraIcon className="w-4 h-4" />
                        Provador Virtual
                    </div>
                </button>
            </div>
          </div>
        </header>

        <div className="w-full flex-grow">
        {appMode === 'fitting-room' ? (
             <VirtualFittingRoom onBack={() => setAppMode('studio')} />
        ) : (
             // ORIGINAL STUDIO MODE CONTENT
             <>
             {!hasAnyImage ? (
                <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
                    <p className="text-lg text-gray-600 text-center mb-8">
                         Crie looks incríveis combinando peças para gerar modelos virtuais com IA.
                    </p>
                    <div className="flex justify-center mb-6 border-b border-gray-200">
                    <button onClick={() => setUploadMode('separate')} className={`px-4 py-2 text-lg font-medium transition-colors duration-200 ${uploadMode === 'separate' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        Peças Separadas
                    </button>
                    <button onClick={() => setUploadMode('combined')} className={`px-4 py-2 text-lg font-medium transition-colors duration-200 ${uploadMode === 'combined' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        Foto Única do Look
                    </button>
                    </div>
                    {uploadMode === 'separate' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                        <div><h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Parte Superior</h2><ImageUploader onImageUpload={(file) => handleImageUpload('top', file)} onOpenProductSearch={() => openProductSearch('top')} /></div>
                        <div><h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Parte Inferior</h2><ImageUploader onImageUpload={(file) => handleImageUpload('bottom', file)} onOpenProductSearch={() => openProductSearch('bottom')} /></div>
                        <div><h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Calçado (Opcional)</h2><ImageUploader onImageUpload={(file) => handleImageUpload('shoes', file)} onOpenProductSearch={() => openProductSearch('shoes')} /></div>
                    </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <div><h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Foto Única do Look</h2><ImageUploader onImageUpload={(file) => handleImageUpload('combined', file)} onOpenProductSearch={() => openProductSearch('combined')} /></div>
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
            </>
        )}
        </div>
      </main>
      <footer className="w-full max-w-4xl mx-auto text-center text-gray-600 mt-12 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-10 md:gap-8 text-sm">
          {/* Contact */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <h3 className="font-semibold text-gray-800 uppercase tracking-wider">Contato</h3>
            <a href="https://www.luibambini.com.br/pages/contact" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-600 transition-colors">
                <WhatsAppIcon className="w-5 h-5" />
                <span>Fale com uma consultora</span>
            </a>
            <a href="https://www.instagram.com/luibambini" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-600 transition-colors">
                <InstagramIcon className="w-5 h-5" />
                <span>@luibambini</span>
            </a>
            <a href="https://www.luibambini.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-600 transition-colors">
                <WebsiteIcon className="w-5 h-5" />
                <span>www.luibambini.com.br</span>
            </a>
          </div>

          {/* Address */}
          <div className="flex flex-col items-center md:items-start gap-3 text-center md:text-left">
            <h3 className="font-semibold text-gray-800 uppercase tracking-wider">Endereço</h3>
            <a href="https://maps.app.goo.gl/HATW2qGmyaHwX9gYA" target="_blank" rel="noopener noreferrer" className="hover:text-pink-600 transition-colors">
              <div className="flex items-start gap-2">
                  <MapPinIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Avenida T-9, 1986 - Jardim América<br />Goiânia - Goias</span>
              </div>
            </a>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-500">
            <p>Copyright © 2025 - Lui Bambini Todos os direitos Reservados</p>
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
