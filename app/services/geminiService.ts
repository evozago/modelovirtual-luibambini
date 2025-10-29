// services/geminiService.ts
// Este arquivo agora fará chamadas para o backend do seu próprio app Remix.

// O endpoint da API agora aponta para uma rota de recurso no seu app Remix.
// Isso mantém suas chaves de API seguras no servidor.
const API_ENDPOINT = '/api/generate';

async function callApi(action, payload) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // O corpo agora inclui a 'action' para que o backend saiba o que fazer.
    body: JSON.stringify({ action, payload }),
  });

  const responseBody = await response.json();

  if (!response.ok) {
    console.error(`Erro da API (${response.status}) para a ação ${action}:`, responseBody.error);
    throw new Error(responseBody.error || `Ocorreu um erro de comunicação com o servidor (${response.status}).`);
  }

  return responseBody;
}

export const processImage = async (imageBase64, mimeType, pieceCount) => {
  const pureBase64 = imageBase64.split(',')[1];
  const { imageBase64: processedImage } = await callApi('process-image', {
    imageBase64: pureBase64,
    mimeType,
    pieceCount,
  });
  return processedImage;
};

export const generateDescription = async (cleanedImageBase64, options) => {
  const pureBase64 = cleanedImageBase64.split(',')[1];
  return await callApi('generate-description', {
    cleanedImageBase64: pureBase64,
    options,
  });
};

export const generateModelImage = async (cleanedImageBase64, continuationCommand, referenceImageBase64s) => {
    const pureCleanedBase64 = cleanedImageBase64.split(',')[1];
    const pureReferenceBase64s = referenceImageBase64s.map(ref => ref.split(',')[1]);

    const { imageBase64: modelImage } = await callApi('generate-model-image', {
        cleanedImageBase64: pureCleanedBase64,
        continuationCommand,
        referenceImageBase64s: pureReferenceBase64s,
    });
    return modelImage;
};

export const editImage = async (originalImageBase64, maskBase64, prompt) => {
    const pureOriginalBase64 = originalImageBase64.split(',')[1];
    const { imageBase64: editedImage } = await callApi('edit-image', {
        originalImageBase64: pureOriginalBase64,
        maskBase64, // A máscara já está sem o prefixo
        prompt,
    });
    return editedImage;
};
