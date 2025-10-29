// services/geminiService.ts - VERSÃO FINAL CORRIGIDA
import type { GenerationOptions, PieceCount } from '../types';

// O endereço do nosso "escritório seguro" que agora mora junto com o site.
const API_ENDPOINT = '/api/generate';

async function callApi<T>(action: string, payload: object): Promise<T> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
  });

  const responseBody = await response.json();

  if (!response.ok) {
    console.error(`Erro da API (${response.status}) para a ação ${action}:`, responseBody.error);
    throw new Error(responseBody.error || `Ocorreu um erro de comunicação com o servidor (${response.status}).`);
  }

  return responseBody;
}

export const processImage = async (imageBase64: string, mimeType: string, pieceCount: PieceCount): Promise<string> => {
  // A API espera base64 puro, sem o prefixo
  const pureBase64 = imageBase64.split(',')[1];
  const { imageBase64: processedImage } = await callApi<{ imageBase64: string }>('process-image', {
    imageBase64: pureBase64,
    mimeType,
    pieceCount,
  });
  return processedImage;
};

export const generateDescription = async (
  cleanedImageBase64: string,
  options: GenerationOptions
): Promise<{ description: string; command: string }> => {
  const pureBase64 = cleanedImageBase64.split(',')[1];
  return await callApi<{ description: string; command: string }>('generate-description', {
    cleanedImageBase64: pureBase64,
    options,
  });
};

export const generateModelImage = async (
    cleanedImageBase64: string,
    continuationCommand: string,
    referenceImageBase64s: string[]
): Promise<string> => {
    const pureCleanedBase64 = cleanedImageBase64.split(',')[1];
    const pureReferenceBase64s = referenceImageBase64s.map(ref => ref.split(',')[1]);

    const { imageBase64: modelImage } = await callApi<{ imageBase64: string }>('generate-model-image', {
        cleanedImageBase64: pureCleanedBase64,
        continuationCommand,
        referenceImageBase64s: pureReferenceBase64s,
    });
    return modelImage;
};

export const editImage = async (
  originalImageBase64: string,
  maskBase64: string,
  prompt: string
): Promise<string> => {
    const pureOriginalBase64 = originalImageBase64.split(',')[1];
    const { imageBase64: editedImage } = await callApi<{ imageBase64: string }>('edit-image', {
        originalImageBase64: pureOriginalBase64,
        maskBase64, // A máscara já está sem o prefixo
        prompt,
    });
    return editedImage;
};