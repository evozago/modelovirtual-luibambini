// api/generate.ts - O CÓDIGO DO SEU "ESCRITÓRIO SEGURO"
import { GoogleGenAI } from '@google/genai';

// Esta é a função principal que a Vercel vai executar
export default async function handler(request: Request) {
  // Permite que a "vitrine" (seu site) se comunique com este "escritório"
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Vercel executa um "pre-flight check" para segurança. Respondemos que está tudo OK.
  if (request.method === 'OPTIONS') {
    return new Response('OK', { status: 200, headers });
  }

  if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido.' }), { status: 405, headers });
  }

  try {
    const { action, payload } = await request.json();

    if (!action || !payload) {
      throw new Error("Requisição inválida. 'action' ou 'payload' ausentes.");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('A chave da API do Gemini não foi configurada no servidor.');
    }

    const ai = new GoogleGenAI({ apiKey });
    let result;

    // A mesma lógica de antes, escolhendo a tarefa a ser feita
    switch (action) {
      case 'process-image':
        result = await handleProcessImage(ai, payload);
        break;
      case 'generate-description':
        result = await handleGenerateDescription(ai, payload);
        break;
      case 'generate-model-image':
        result = await handleGenerateModelImage(ai, payload);
        break;
      case 'edit-image':
        result = await handleEditImage(ai, payload);
        break;
      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), { status: 200, headers });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}


// --- Funções Auxiliares (A lógica da IA) ---

async function handleProcessImage(ai: GoogleGenAI, { imageBase64, mimeType, pieceCount }: any) {
    const systemInstruction = `Sua tarefa é receber uma imagem de uma peça de roupa infantil, remover completamente o fundo e quaisquer acessórios (cabides, etc.), e retornar uma imagem PNG limpa, com fundo transparente. A peça de roupa é um ${pieceCount}.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: { data: imageBase64, mimeType } }, { text: systemInstruction }] },
        config: { responseModalities: ['IMAGE'] }
    });
    const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
    if (!imagePart?.inlineData) throw new Error("A IA não retornou uma imagem processada.");
    return { imageBase64: imagePart.inlineData.data };
}

async function handleGenerateDescription(ai: GoogleGenAI, { cleanedImageBase64, options }: any) {
    const prompt = `Você é um copywriter de moda infantil. Analise a imagem. Retorne um objeto JSON com as chaves "description" (descrição curta) e "command" (prompt técnico para gerar uma imagem de marketing com modelo, baseada nas opções: ${JSON.stringify(options)}). Não adicione markdown.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ inlineData: { data: cleanedImageBase64, mimeType: 'image/png' } }, { text: prompt }] },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
}

async function handleGenerateModelImage(ai: GoogleGenAI, { cleanedImageBase64, continuationCommand, referenceImageBase64s }: any) {
    const systemInstruction = `Gere uma foto de marketing de uma criança modelo vestindo a(s) peça(s). REGRAS CRÍTICAS: A roupa na imagem gerada deve ser IDÊNTICA às imagens de referência originais, preservando 100% dos detalhes. Após gerar, compare criticamente com as referências e corrija qualquer discrepância. A fidelidade às referências é a prioridade máxima. Siga o comando para o estilo da foto.`;
    
    const contents = { parts: [
        { inlineData: { data: cleanedImageBase64, mimeType: 'image/png' } },
        { text: continuationCommand },
        ...referenceImageBase64s.map((ref: string) => ({ inlineData: { data: ref, mimeType: 'image/jpeg' } }))
    ]};

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents,
        config: { systemInstruction, responseModalities: ['IMAGE'] }
    });
    const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
    if (!imagePart?.inlineData) throw new Error("A IA não retornou uma imagem de modelo.");
    return { imageBase64: imagePart.inlineData.data };
}

async function handleEditImage(ai: GoogleGenAI, { originalImageBase64, maskBase64, prompt }: any) {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [
            { inlineData: { data: originalImageBase64, mimeType: 'image/png' } },
            { inlineData: { data: maskBase64, mimeType: 'image/png' } },
            { text: prompt },
        ]},
        config: { responseModalities: ['IMAGE'] }
    });
    const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
    if (!imagePart?.inlineData) throw new Error("A IA não retornou uma imagem editada.");
    return { imageBase64: imagePart.inlineData.data };
}
