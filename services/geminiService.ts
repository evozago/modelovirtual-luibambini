
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { GenerationOptions } from '../types';
import { Age, Gender } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const imageModel = 'gemini-2.5-flash-image';
const textModel = 'gemini-2.5-flash';

const imageProcessingPrompt = `A partir da imagem fornecida, execute as seguintes tarefas em ordem:
1. Identifique a peça de roupa principal (vestido, conjunto, etc.).
2. Remova completamente todos os outros elementos, incluindo o fundo, acessórios (sapatos, laços, tiaras, brinquedos, etiquetas), e qualquer parte do corpo humano ou cabides.
3. Se um acessório estiver sobre a peça de roupa, use inpainting para reconstruir de forma realista o tecido da roupa por baixo, mantendo a textura, cor e padrão originais.
4. O resultado final DEVE SER uma imagem PNG contendo APENAS a peça de roupa principal, centralizada, sobre um fundo 100% transparente.`;

const createTextGenerationPrompt = (options: GenerationOptions) => {
  const { gender, age, theme, background } = options;

  let subject: string;
  if (age === Age.BABY) {
    subject = 'um bebê';
  } else {
    subject = gender === Gender.MALE ? 'um menino' : 'uma menina';
  }

  const continuationCommandTemplate = `Gerar imagem de ${subject} de ${age} vestindo [DESCRIÇÃO], mantendo fielmente todas as características, cores e detalhes originais da roupa. ${
    background
      ? `O cenário deve ser "${background}" com um tema de "${theme}".`
      : `O cenário deve ser adequado para um tema de "${theme}".`
  } Permitir acessórios harmoniosos e cenário adequado, mas sem modificar a peça original.`;

  return `Recebe: imagem limpa (imagem final da peça sem fundo).

Tarefa 1 — Descrição curta:
Crie uma descrição breve e objetiva no formato:
[tipo da peça] [característica principal] [cor ou estampa]
Exemplos: "Vestido floral vermelho", "Conjunto listrado azul", "Macacão jeans claro".
A descrição deve ter no máximo 4–6 palavras e ser direta.

Tarefa 2 — Comando de continuação para geração de modelo:
Usando a descrição que você gerou na Tarefa 1 para preencher o campo [DESCRIÇÃO], crie o comando de continuação EXATAMENTE no seguinte formato:
"${continuationCommandTemplate}"

Regras:
- Use apenas as informações visuais na imagem limpa.
- Não adicione nem elimine detalhes da peça.
- Responda com um objeto JSON contendo as chaves "description" e "command".`;
};

const modelImageSystemInstruction = `Você é um gerador de imagens de IA especializado em fotografia de moda infantil. Seu objetivo é gerar uma imagem realista de uma criança vestindo EXATAMENTE a peça de roupa fornecida como imagem de referência.

Regras Imperativas:
1.  **Fidelidade Absoluta à Peça**: Preserve 100% das cores, estampas, texturas, bordados, costuras e proporções da peça de roupa da imagem de referência. NÃO redesenhe ou altere a peça. Ela deve ser idêntica.
2.  **Uso da Imagem de Referência**: Use a imagem de referência (a peça de roupa com fundo transparente) e aplique-a sobre o corpo do modelo. Ajuste apenas o caimento, dobras, iluminação e perspectiva para que pareça natural, sem alterar os padrões ou cores da peça.
3.  **Ajuste de Tamanho**: Adapte a peça proporcionalmente à faixa etária solicitada no prompt.
4.  **Acessórios e Cenário**: Adicione acessórios e crie um cenário que correspondam ao tema e fundo solicitados no prompt. Os acessórios não devem cobrir ou modificar a peça principal.
5.  **Segurança e Respeito**: As poses e o contexto da imagem devem ser totalmente apropriados para a idade da criança. É PROIBIDO sexualizar a imagem.`;


export const processImage = async (imageBase64: string, mimeType: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: imageModel,
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        {
          text: imageProcessingPrompt,
        },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.[0];
  if (imagePart && imagePart.inlineData) {
    return imagePart.inlineData.data;
  }
  
  throw new Error('Falha ao processar a imagem. A resposta da IA não continha uma imagem.');
};

export const generateDescription = async (
  cleanedImageBase64: string,
  options: GenerationOptions
): Promise<{ description: string; command: string }> => {
  const textGenerationPrompt = createTextGenerationPrompt(options);

  const response = await ai.models.generateContent({
    model: textModel,
    contents: {
      parts: [
        {
          inlineData: {
            data: cleanedImageBase64,
            mimeType: 'image/png',
          },
        },
        { text: textGenerationPrompt },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: {
            type: Type.STRING,
            description: 'Descrição curta da peça de roupa.',
          },
          command: {
            type: Type.STRING,
            description:
              'Comando de continuação para gerar uma imagem de modelo.',
          },
        },
        required: ['description', 'command'],
      },
    },
  });

  try {
    const result = JSON.parse(response.text);
    if (
      result &&
      typeof result.description === 'string' &&
      typeof result.command === 'string'
    ) {
      return result;
    }
  } catch (e) {
    console.error('Failed to parse JSON response:', e, response.text);
  }

  throw new Error(
    'Falha ao gerar descrição. A resposta da IA não está no formato esperado.'
  );
};

export const generateModelImage = async (cleanedImageBase64: string, continuationCommand: string): Promise<string> => {
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanedImageBase64,
              mimeType: 'image/png',
            },
          },
          {
            text: continuationCommand,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
        systemInstruction: modelImageSystemInstruction,
        temperature: 0.3,
      },
    });
  
    const imagePart = response.candidates?.[0]?.content?.parts?.[0];
    if (imagePart && imagePart.inlineData) {
      return imagePart.inlineData.data;
    }
    
    throw new Error('Falha ao gerar a imagem do modelo. A resposta da IA não continha uma imagem.');
  };