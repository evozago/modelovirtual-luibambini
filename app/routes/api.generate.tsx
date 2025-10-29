// app/routes/api.generate.tsx
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GenerationOptions, PieceCount } from "../types";

// IMPORTANTE: Sua chave de API do Gemini deve estar no arquivo .env como GEMINI_API_KEY
if (!process.env.GEMINI_API_KEY) {
  // Em produção, você pode querer logar isso em vez de travar o servidor.
  // Por enquanto, isso garante que você não esqueça de configurar a chave.
  console.error("ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não está definida.");
  // Retorna uma resposta de erro genérica para não expor detalhes internos.
  // A UI do frontend irá capturar esse erro e mostrar uma mensagem amigável.
}

// Inicializa o cliente da IA apenas uma vez para reutilização.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

// Esta função 'action' do Remix é o nosso endpoint de backend seguro.
// Ela funciona como um porteiro: recebe os pedidos, direciona para a função correta
// e lida com erros de forma centralizada.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (!process.env.GEMINI_API_KEY) {
    return json({ error: "O serviço de IA não está configurado corretamente. Por favor, contate o suporte." }, { status: 500 });
  }

  if (request.method !== "POST") {
    return json({ error: "Método não permitido" }, { status: 405 });
  }

  let action, payload;
  try {
    const body = await request.json();
    action = body.action;
    payload = body.payload;

    if (!action || !payload) {
      return json({ error: "Requisição inválida: 'action' e 'payload' são obrigatórios." }, { status: 400 });
    }

    // Direciona a requisição para a função de IA apropriada.
    switch (action) {
      case "process-image":
        return await processImageAction(payload);
      case "generate-description":
        return await generateDescriptionAction(payload);
      case "generate-model-image":
        return await generateModelImageAction(payload);
      case "edit-image":
        return await editImageAction(payload);
      default:
        return json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    // Captura qualquer erro que ocorra durante o processamento da IA
    // e retorna uma resposta de erro padronizada.
    console.error(`Erro na ação da API '${action || 'desconhecida'}':`, error);
    return json({ error: error.message || "Ocorreu um erro inesperado no servidor." }, { status: 500 });
  }
};


// Funções de Lógica da IA (Separadas para clareza)

const processImageAction = async (payload: { imageBase64: string, mimeType: string, pieceCount: PieceCount }) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Modelo otimizado para tarefas de imagem
      contents: {
        parts: [
          { inlineData: { mimeType: payload.mimeType, data: payload.imageBase64 } },
          { text: `Você é um especialista em edição de moda para e-commerce. Remova completamente o fundo desta imagem de produto (${payload.pieceCount}). Se houver acessórios, cabides, etiquetas ou qualquer item que não seja a peça de roupa principal, remova-os também. A saída deve ser um PNG com fundo transparente da peça de roupa perfeitamente limpa e recortada.` },
        ],
      },
      // Usamos responseModalities para pedir uma imagem como resposta
      config: { responseModalities: [Modality.IMAGE] }
    });
    
    // Extrai a imagem da resposta da IA
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.mimeType.startsWith('image/'));
    if (imagePart?.inlineData?.data) {
       return json({ imageBase64: imagePart.inlineData.data });
    }
    throw new Error("A IA não retornou uma imagem válida após a limpeza.");
};


const generateDescriptionAction = async (payload: { cleanedImageBase64: string, options: GenerationOptions }) => {
    const { cleanedImageBase64, options } = payload;
    const { gender, age, theme, background } = options;
    const prompt = `
      Analisando esta imagem de roupa infantil, gere dois itens em formato JSON:
      1.  "description": Uma descrição de produto concisa e atraente para um e-commerce de luxo (máximo de 250 caracteres), focada nos detalhes da peça. Exemplo: "Elegante vestido de festa com saia de tule e detalhes em renda, perfeito para ocasiões especiais."
      2.  "command": Um comando de continuação em inglês para uma IA de imagem gerar uma foto de um modelo infantil vestindo esta peça. O comando deve incluir: um modelo infantil (gênero: ${gender}, idade: ${age}), vestindo a peça da imagem, em um cenário (tema: ${theme}), com um fundo opcional de '${background || 'decidido pela IA'}'. O estilo deve ser de uma fotografia de alta qualidade para e-commerce de moda. Exemplo: "High-fashion ecommerce photography of a ${age} ${gender === 'FEMININO' ? 'girl' : 'boy'} model wearing the provided outfit, in a ${theme} setting, full body shot, bright studio lighting --style raw".
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', // Usamos um modelo mais potente para maior precisão no JSON
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: cleanedImageBase64 } },
            { text: prompt },
          ],
        },
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              command: { type: Type.STRING }
            }
          }
        }
    });
    
    const text = response.text.trim();
    // O Remix 'json' helper já lida com a serialização para nós.
    return json(JSON.parse(text));
};


const generateModelImageAction = async (payload: { cleanedImageBase64: string, continuationCommand: string, referenceImageBase64s: string[] }) => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: payload.continuationCommand },
            { inlineData: { mimeType: 'image/png', data: payload.cleanedImageBase64 } },
             // Adicionar referências pode melhorar a consistência, se o modelo suportar
          ],
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.mimeType.startsWith('image/'));
    if (imagePart?.inlineData?.data) {
        return json({ imageBase64: imagePart.inlineData.data });
    }
    throw new Error("A IA não conseguiu gerar a imagem do modelo.");
};


const editImageAction = async (payload: { originalImageBase64: string, maskBase64: string, prompt: string }) => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: payload.prompt },
            { inlineData: { mimeType: 'image/png', data: payload.originalImageBase64 } },
            // A terceira parte é a máscara para edição in-painting
            { inlineData: { mimeType: 'image/png', data: payload.maskBase64 } },
          ],
        },
        config: { responseModalities: [Modality.IMAGE] }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.mimeType.startsWith('image/'));
    if (imagePart?.inlineData?.data) {
        return json({ imageBase64: imagePart.inlineData.data });
    }
    throw new Error("A IA não conseguiu editar a imagem.");
};
