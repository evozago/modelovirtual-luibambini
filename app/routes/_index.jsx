import React, { useState, useCallback } from 'react';

// NOTA DE REFACTOR: O código foi atualizado para usar TypeScript e para importar os componentes, hooks e serviços da raiz do projeto (ex: ../../components).
// Isso centraliza o código e remove a dependência dos arquivos duplicados e sem tipos que existiam dentro da pasta 'app/'. 
// Recomenda-se remover as pastas duplicadas como 'app/components', 'app/hooks' e 'app/services' para evitar confusão futura.
import { ProcessingView } from '../../components/ProcessingView';
import { ResultsCard } from '../../components/ResultsCard';
import { LogoIcon } from '../../components/Icons';
import { GenerationOptionsForm } from '../../components/GenerationOptionsForm';
import { ImageEditor } from '../../components/ImageEditor';
import { LookBuilderPanel } from '../../components/LookBuilderPanel';
import { usePersistentState } from '../../hooks/usePersistentState';
import { processImage, generateDescription, generateModelImage, editImage } from '../../services/geminiService';
import { combineImages } from '../../utils/fileUtils';
import type { 
  ProcessingState,
  ProductOutput,
  GenerationOptions,
  ClothingImagesState,
} from '../../types';
import { 
  ProcessingStep, 
  Gender, 
  Age, 
  Theme, 
  PieceCount
} from '../../types';


// No Remix, a exportação padrão de um arquivo de rota é o componente da página.
export default function Index() {
  const [uploadMode, setUploadMode] = usePersistentState<'separate' | 'combined'>('lui-bambini-upload-mode', 'separate');
  const [clothingImages, setClothingImages] = usePersistentState<ClothingImagesState>('lui-bambini-look-builder', { top: null, bottom: null, shoes: null, combined: null });

  const [processingState, setProcessingState] = useState<ProcessingState>({ step: ProcessingStep.IDLE });
  const [productOutput, setProductOutput] = useState<ProductOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [generationOptions, setGenerationOptions] = useState<Omit<GenerationOptions, 'pieceCount'>>({
    gender: Gender.FEMALE,
    age: Age.FOUR_TO_EIGHT,
    theme: Theme.CASUAL,
    background: '',
  });

    const handleImageUpload = async (part: keyof ClothingImagesState, file: File) => {
        const dataUrl = URL.createObjectURL(file);
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setClothingImages(prev => ({ ...prev, [part]: reader.result }));
            }
        };
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
        } else {
            if (!clothingImages.combined) return;
            imagesToProcess = [clothingImages.combined, clothingImages.shoes].filter((img): img is string => img !== null);
        }
        
        if (imagesToProcess.length === 0) return;

        setError(null);
        setProductOutput(null);

        try {
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
            imagesToProcess
        );

        setProductOutput({
            cleanedImage: `data:image/png;base64,${cleanedImageBase64}`,
            modelImage: `data:image/png;base64,${modelImageBase64}`,
            description,
            continuationCommand: command,
        });
        setProcessingState({ step: ProcessingStep.DONE });
        } catch (err: any) {
        console.error(err);
        setError(err.message || 'Ocorreu um erro ao processar as imagens.');
        setProcessingState({ step: ProcessingStep.ERROR });
        }
    }, [clothingImages, generationOptions, uploadMode]);

    const handleEditImage = useCallback(async (maskBase64: string, editPrompt: string) => {
        if (!productOutput) return;

        setIsEditing(false);
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
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Ocorreu um erro ao editar a imagem.');
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
                    <p className="text-gray-600 mt-2 max-w-sm">Navegue pela sua loja e clique em "Adicionar ao Look" nos produtos para começar a criar.</p>
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
        <main className="p-4 md:p-8 w-full flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 items-start bg-gray-50 min-h-screen">
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
    );
}