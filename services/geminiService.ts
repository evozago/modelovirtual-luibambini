import type { GenerationOptions, PieceCount } from '../types';

// O endereço do seu "escritório seguro" que você me forneceu.
const PIPEDREAM_WEBHOOK_URL = 'https://eoqrer10z88o5oo.m.pipedream.net';

/**
 * Função central para se comunicar com o seu backend seguro no Pipedream.
 * @param action - A tarefa a ser executada (ex: 'generate-model-image').
 * @param payload - Os dados necessários para a tarefa (ex: imagens, opções).
 * @returns A resposta do backend.
 */
async function callPipedreamApi<T>(action: string, payload: object): Promise<T> {
  const response = await fetch(PIPEDREAM_WEBHOOK_URL, {
    method: 'POST',
    // O Pipedream não exige 'Content-Type' para webhooks, mas é uma boa prática.
    // O corpo da requisição agora inclui a ação e os dados para o Pipedream saber o que fazer.
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Erro na API do Pipedream (${response.status}) para a ação ${action}: ${errorBody}`);
    throw new Error(`Ocorreu um erro de comunicação com o servidor de IA (${response.status}). Por favor, tente novamente.`);
  }

  return response.json();
}

export const processImage = async (imageBase64: string, mimeType: string, pieceCount: PieceCount): Promise<string> => {
  const { imageBase64: processedImage } = await callPipedreamApi<{ imageBase64: string }>('process-image', {
    imageBase64,
    mimeType,
    pieceCount,
  });
  return processedImage;
};

export const generateDescription = async (
  cleanedImageBase64: string,
  options: GenerationOptions
): Promise<{ description: string; command: string }> => {
  return await callPipedreamApi<{ description: string; command: string }>('generate-description', {
    cleanedImageBase64,
    options,
  });
};

export const generateModelImage = async (
    cleanedImageBase64: string, 
    continuationCommand: string,
    referenceImageBase64s: string[]
): Promise<string> => {
    const { imageBase64: modelImage } = await callPipedreamApi<{ imageBase64: string }>('generate-model-image', {
        cleanedImageBase64,
        continuationCommand,
        referenceImageBase64s,
    });
    return modelImage;
};

export const editImage = async (
  originalImageBase64: string,
  maskBase64: string,
  prompt: string
): Promise<string> => {
    const { imageBase64: editedImage } = await callPipedreamApi<{ imageBase64: string }>('edit-image', {
        originalImageBase64,
        maskBase64,
        prompt,
    });
    return editedImage;
};
