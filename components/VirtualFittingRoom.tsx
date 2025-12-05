
import React, { useState, useCallback } from 'react';
import { CameraIcon, HangerIcon, XIcon, SparklesIcon } from './Icons';
import { ProductSearchModal } from './ProductSearchModal';
import { ImageUploader } from './ImageUploader';
import { ProcessingView } from './ProcessingView';
import { fileToBase64, combineImages } from '../utils/fileUtils';
import { processImage, generateDescription, generateModelImage } from '../services/geminiService';
import type { ProcessingState, ProductOutput, GenerationOptions } from '../types';
import { ProcessingStep, Gender, Age, Theme, PieceCount } from '../types';

interface VirtualFittingRoomProps {
    onBack: () => void;
}

export const VirtualFittingRoom: React.FC<VirtualFittingRoomProps> = ({ onBack }) => {
    const [customerPhoto, setCustomerPhoto] = useState<File | null>(null);
    const [selectedClothes, setSelectedClothes] = useState<File | null>(null);
    const [processingState, setProcessingState] = useState<ProcessingState>({ step: ProcessingStep.IDLE });
    const [productOutput, setProductOutput] = useState<ProductOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showProductSearch, setShowProductSearch] = useState(false);
    
    // Default options for fitting room - we want fidelity to the customer
    const generationOptions: Omit<GenerationOptions, 'pieceCount'> = {
        gender: Gender.FEMALE, // This acts as a fallback, but the image prompt overrides
        age: Age.FOUR_TO_EIGHT, // Fallback
        theme: Theme.CASUAL,
        background: '', // Let AI decide or keep original
    };

    const handleCustomerPhotoUpload = (file: File) => {
        setCustomerPhoto(file);
        setProductOutput(null);
        setError(null);
    };

    const handleClothesUpload = (file: File) => {
        setSelectedClothes(file);
        setProductOutput(null);
        setError(null);
    };

    const handleClothesFromUrl = useCallback(async (url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            const filename = url.substring(url.lastIndexOf('/') + 1).split('?')[0] || 'product.jpg';
            const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
            handleClothesUpload(file);
        } catch (err) {
            console.error("Error fetching image from URL:", err);
            setError("Erro ao carregar imagem do produto.");
        } finally {
            setShowProductSearch(false);
        }
    }, []);

    const handleProcessFitting = useCallback(async () => {
        if (!customerPhoto || !selectedClothes) return;

        setError(null);
        setProductOutput(null);
        setProcessingState({ step: ProcessingStep.CLEANING });

        try {
            // 1. Prepare Clothing Image (Clean it)
            const clothesBase64 = await fileToBase64(selectedClothes);
            // We assume single piece or combined set for the fitting room for simplicity
            const pieceCount = PieceCount.SET; 
            
            // Clean the clothes to get a perfect overlay asset
            const cleanedClothesBase64 = await processImage(clothesBase64, selectedClothes.type, pieceCount);

            // 2. Generate Description (needed for the prompt)
            setProcessingState({ step: ProcessingStep.GENERATING_TEXT });
            // We pass standard options, but the prompt will rely heavily on the visual input
            const textGenOptions = { ...generationOptions, pieceCount };
            const { description, command, socialMediaPost } = await generateDescription(cleanedClothesBase64, textGenOptions);

            // 3. Generate Final Image using Customer Photo as Base
            setProcessingState({ step: ProcessingStep.GENERATE_MODEL_IMAGE });
            const customerPhotoBase64 = await fileToBase64(customerPhoto);
            
            // We pass the cleaned clothes as the "reference" for details as well
            const finalImageBase64 = await generateModelImage(
                cleanedClothesBase64,
                command,
                [clothesBase64], // Use original clothes as reference
                customerPhotoBase64 // THIS is the key: passing the customer photo
            );

            setProductOutput({
                cleanedImage: `data:image/png;base64,${cleanedClothesBase64}`,
                modelImage: `data:image/png;base64,${finalImageBase64}`,
                description,
                continuationCommand: command,
                socialMediaPost
            });

            setProcessingState({ step: ProcessingStep.DONE });

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao processar o provador virtual.");
            setProcessingState({ step: ProcessingStep.ERROR });
        }
    }, [customerPhoto, selectedClothes, generationOptions]);

    const handleReset = () => {
        setCustomerPhoto(null);
        setSelectedClothes(null);
        setProductOutput(null);
        setProcessingState({ step: ProcessingStep.IDLE });
        setError(null);
    };

    const isProcessing = ![ProcessingStep.IDLE, ProcessingStep.DONE, ProcessingStep.ERROR].includes(processingState.step);

    if (isProcessing) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border border-pink-100 p-8 h-[80vh] flex flex-col justify-center">
                 <ProcessingView state={processingState} />
            </div>
        );
    }

    if (productOutput) {
        return (
            <div className="flex flex-col h-full gap-6">
                <div className="bg-white rounded-2xl shadow-xl border border-pink-100 p-4 flex-grow flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Voltar">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                            </button>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <SparklesIcon className="w-6 h-6 text-pink-500" />
                                Resultado do Provador
                            </h2>
                        </div>
                        <button onClick={handleReset} className="px-4 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 font-medium transition-colors">
                            Novo Look
                        </button>
                    </div>
                    
                    <div className="flex-grow flex flex-col md:flex-row gap-4 items-center justify-center bg-gray-50 rounded-xl p-4">
                         {/* Comparison View */}
                         <div className="relative h-96 w-full max-w-sm">
                            <img src={URL.createObjectURL(customerPhoto!)} className="w-full h-full object-cover rounded-lg opacity-50" alt="Original" />
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Original</div>
                         </div>
                         <div className="text-gray-400 hidden md:block">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                            </svg>
                         </div>
                         <div className="relative h-[60vh] w-full max-w-lg shadow-2xl">
                            <img src={productOutput.modelImage} className="w-full h-full object-contain bg-white rounded-lg" alt="Resultado Provador" />
                             <div className="absolute top-2 left-2 bg-pink-600 text-white text-xs px-2 py-1 rounded shadow">Virtual</div>
                         </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-start">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-pink-600 transition-colors py-2 px-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    <span>Voltar ao Estúdio</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                
                {/* Column 1: The Model (Customer) */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6 flex flex-col items-center justify-center min-h-[400px]">
                    <h3 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
                        <CameraIcon className="w-6 h-6 text-pink-500" />
                        1. Foto do Cliente
                    </h3>
                    
                    {customerPhoto ? (
                        <div className="relative w-full h-full max-h-[500px] group">
                            <img src={URL.createObjectURL(customerPhoto)} className="w-full h-full object-cover rounded-2xl" alt="Cliente" />
                            <button 
                                onClick={() => setCustomerPhoto(null)} 
                                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 text-red-500 transition-all transform hover:scale-110"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center">
                            <label className="cursor-pointer flex flex-col items-center justify-center w-full h-64 border-4 border-dashed border-gray-200 rounded-3xl hover:border-pink-300 hover:bg-pink-50 transition-all group">
                                <div className="p-6 bg-pink-100 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                    <CameraIcon className="w-12 h-12 text-pink-600" />
                                </div>
                                <span className="text-xl font-medium text-gray-600 group-hover:text-pink-600">Tirar Foto / Carregar</span>
                                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && handleCustomerPhotoUpload(e.target.files[0])} />
                            </label>
                            <p className="mt-4 text-gray-400 text-sm text-center">Use a câmera do tablet ou carregue da galeria</p>
                        </div>
                    )}
                </div>

                {/* Column 2: The Clothes */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6 flex flex-col items-center justify-center min-h-[400px]">
                    <h3 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
                        <HangerIcon className="w-6 h-6 text-pink-500" />
                        2. Escolher Look
                    </h3>

                    {selectedClothes ? (
                        <div className="relative w-full h-full max-h-[500px] group">
                             <img src={URL.createObjectURL(selectedClothes)} className="w-full h-full object-contain rounded-2xl p-4 bg-gray-50" alt="Roupa" />
                             <button 
                                onClick={() => setSelectedClothes(null)} 
                                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 text-red-500 transition-all transform hover:scale-110"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                            <button 
                                onClick={() => setShowProductSearch(true)}
                                className="w-full py-6 rounded-2xl bg-pink-50 border-2 border-pink-100 hover:border-pink-300 hover:bg-pink-100 flex flex-col items-center transition-all"
                            >
                                <span className="text-lg font-semibold text-pink-700">Buscar na Loja</span>
                                <span className="text-sm text-pink-500">Encontre pelo nome ou SKU</span>
                            </button>
                            <div className="text-gray-400 font-medium">- OU -</div>
                            <label className="cursor-pointer w-full py-6 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-100 flex flex-col items-center transition-all">
                                <span className="text-lg font-semibold text-gray-600">Carregar Foto da Roupa</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleClothesUpload(e.target.files[0])} />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-center z-40 md:static md:shadow-none md:bg-transparent md:p-0">
                <button
                    onClick={handleProcessFitting}
                    disabled={!customerPhoto || !selectedClothes}
                    className="w-full md:max-w-md bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xl font-bold py-4 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                >
                    <SparklesIcon className="w-6 h-6" />
                    VESTIR AGORA
                </button>
            </div>

            {error && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-600 px-6 py-3 rounded-full shadow-lg z-50 animate-bounce">
                    {error}
                </div>
            )}

            {showProductSearch && (
                <ProductSearchModal 
                    onImageSelect={handleClothesFromUrl}
                    onClose={() => setShowProductSearch(false)}
                />
            )}
        </div>
    );
};
