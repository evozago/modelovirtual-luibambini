// app/routes/api.generate.tsx
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerationOptions, PieceCount } from "../types";

// Inicializa a IA do Google com a chave de API do ambiente.
// IMPORTANTE: Sua chave de API do Gemini deve estar no arquivo .env como GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Esta função 'action' do Remix é o nosso endpoint de backend.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Método não permitido" }, { status: 405 });
  }

  try {
    const { action, payload } = await request.json();

    switch (action) {
      case "process-image":
        return await processImage(payload);
      case "generate-description":
        return await generateDescription(payload);
      case "generate-model-image":
        return await generateModelImage(payload);
      case "edit-image":
        return await editImage(payload);
      default:
        return json({ error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Erro na ação da API: ${error.message}`);
    return json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
  }
};

// Funções de Lógica da IA

const processImage = async (payload: { imageBase64: string, mimeType: string, pieceCount: PieceCount }) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: payload.mimeType,
            data: payload.imageBase64,
          },
        },
        {
          text: `Você é um especialista em edição de moda para e-commerce. Remova completamente o fundo desta imagem de produto (${payload.pieceCount}). Se houver acessórios, cabides, etiquetas ou qualquer item que não seja a peça de roupa principal, remova-os também. A saída deve ser um PNG com fundo transparente da peça de roupa perfeitamente limpa e recortada.`,
        },
      ],
    },
    config: { responseMimeType: "image/png" }
  });
  
  if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
     const imagePart = response.candidates[0].content.parts[0];
     return json({ imageBase64: imagePart.inlineData.data });
  }
  throw new Error("A IA não conseguiu processar a imagem.");
};


const generateDescription = async (payload: { cleanedImageBase64: string, options: GenerationOptions }) => {
    const { cleanedImageBase64, options } = payload;
    const { gender, age, theme, background } = options;
    const prompt = `
      Analisando esta imagem de roupa infantil, gere dois itens em formato JSON:
      1.  "description": Uma descrição de produto concisa e atraente para um e-commerce de luxo (máximo de 250 caracteres), focada nos detalhes da peça. Exemplo: "Elegante vestido de festa com saia de tule e detalhes em renda, perfeito para ocasiões especiais."
      2.  "command": Um comando de continuação em inglês para uma IA de imagem (como Midjourney ou DALL-E) gerar uma foto de um modelo infantil vestindo esta peça. O comando deve incluir: um modelo infantil (gênero: ${gender}, idade: ${age}), vestindo a peça da imagem, em um cenário (tema: ${theme}), com um fundo opcional de '${background || 'decidido pela IA'}'. O estilo deve ser de uma fotografia de alta qualidade para e-commerce de moda. Exemplo: "High-fashion ecommerce photography of a ${age} ${gender === 'FEMININO' ? 'girl' : 'boy'} model wearing the provided outfit, in a ${theme} setting, full body shot, bright studio lighting --style raw".
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: cleanedImageBase64 } },
            { text: prompt },
          ],
        },
        config: { responseMimeType: "application/json" }
    });
    
    const text = response.text.trim();
    return json(JSON.parse(text));
};


const generateModelImage = async (payload: { cleanedImageBase64: string, continuationCommand: string, referenceImageBase64s: string[] }) => {
    const { cleanedImageBase64, continuationCommand, referenceImageBase64s } = payload;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: continuationCommand },
            { inlineData: { mimeType: 'image/png', data: cleanedImageBase64 } },
          ],
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.mimeType.startsWith('image/'));
    if (imagePart?.inlineData) {
        return json({ imageBase64: imagePart.inlineData.data });
    }
    throw new Error("A IA não conseguiu gerar a imagem do modelo.");
};


const editImage = async (payload: { originalImageBase64: string, maskBase64: string, prompt: string }) => {
    const { originalImageBase64, maskBase64, prompt } = payload;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/png', data: originalImageBase64 } },
            { inlineData: { mimeType: 'image/png', data: maskBase64 } },
          ],
        },
        config: { responseModalities: [Modality.IMAGE] }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.mimeType.startsWith('image/'));
    if (imagePart?.inlineData) {
        return json({ imageBase64: imagePart.inlineData.data });
    }
    throw new Error("A IA não conseguiu editar a imagem.");
};
