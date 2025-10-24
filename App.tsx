
import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ProcessingView } from './components/ProcessingView';
import { ResultsCard } from './components/ResultsCard';
import { LogoIcon, GithubIcon } from './components/Icons';
import { processImage, generateDescription, generateModelImage } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import type { ProcessingState, ProductOutput, GenerationOptions } from './types';
import { ProcessingStep, Gender, Age, Theme } from './types';
import { GenerationOptionsForm } from './components/GenerationOptionsForm';


export default function App() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({ step: ProcessingStep.IDLE });
  const [productOutput, setProductOutput] = useState<ProductOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    gender: Gender.FEMALE,
    age: Age.FOUR_TO_EIGHT,
    theme: Theme.CASUAL,
    background: '',
  });

  const handleImageUpload = (file: File) => {
    setOriginalImage(file);
    setProductOutput(null);
    setError(null);
    setProcessingState({ step: ProcessingStep.IDLE });
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProductOutput(null);
    setError(null);
    setProcessingState({ step: ProcessingStep.IDLE });
  };
  
  const handleProcessImage = useCallback(async () => {
    if (!originalImage) return;

    setError(null);
    setProductOutput(null);

    try {
      setProcessingState({ step: ProcessingStep.CLEANING });
      const imageBase64 = await fileToBase64(originalImage);
      const cleanedImageBase64 = await processImage(imageBase64, originalImage.type);

      setProcessingState({ step: ProcessingStep.GENERATING_TEXT });
      const { description, command } = await generateDescription(cleanedImageBase64, generationOptions);

      setProcessingState({ step: ProcessingStep.GENERATE_MODEL_IMAGE });
      const modelImageBase64 = await generateModelImage(cleanedImageBase64, command);

      setProductOutput({
        cleanedImage: `data:image/png;base64,${cleanedImageBase64}`,
        modelImage: `data:image/png;base64,${modelImageBase64}`,
        description,
        continuationCommand: command,
      });
      setProcessingState({ step: ProcessingStep.DONE });
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao processar a imagem. Por favor, tente novamente.');
      setProcessingState({ step: ProcessingStep.ERROR });
    }
  }, [originalImage, generationOptions]);


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-4xl mx-auto flex flex-col items-center flex-grow">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-2">
            <LogoIcon />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">AI Product Image Cleaner</h1>
          </div>
          <p className="text-lg text-gray-600">
            Transforme fotos de produtos em imagens prontas para e-commerce com IA.
          </p>
        </header>

        <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
          {!originalImage ? (
            <ImageUploader onImageUpload={handleImageUpload} />
          ) : (
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              <div className="w-full md:w-1/2 flex flex-col items-center">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Imagem Original</h2>
                <img
                  src={URL.createObjectURL(originalImage)}
                  alt="Original"
                  className="rounded-lg max-h-96 object-contain"
                />
              </div>
              <div className="w-full md:w-1/2 flex flex-col">
                {processingState.step !== ProcessingStep.IDLE && processingState.step !== ProcessingStep.DONE && processingState.step !== ProcessingStep.ERROR ? (
                   <ProcessingView state={processingState} />
                ) : productOutput ? (
                  <ResultsCard output={productOutput} onReset={handleReset} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <GenerationOptionsForm
                      options={generationOptions}
                      setOptions={setGenerationOptions}
                    />
                    <div className="w-full">
                      <button
                        onClick={handleProcessImage}
                        className="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                      >
                        Processar Imagem com IA
                      </button>
                      <button onClick={handleReset} className="mt-4 text-sm text-gray-500 hover:text-gray-700">
                        Escolher outra imagem
                      </button>
                    </div>
                  </div>
                )}
                 {error && <div className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</div>}
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="w-full max-w-4xl mx-auto text-center text-gray-500 text-sm mt-8">
        <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-indigo-600 transition-colors">
            <GithubIcon />
            Powered by Google Gemini
        </a>
      </footer>
    </div>
  );
}