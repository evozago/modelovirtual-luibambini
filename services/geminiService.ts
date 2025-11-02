import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { GenerationOptions } from '../types';
import { Age, Gender, PieceCount } from '../types';

// O código é configurado para encontrar a chave de API em diferentes ambientes:
// 1. `process.env.API_KEY`: Injetado pelo ambiente do AI Studio.
// 2. `import.meta.env.VITE_IA_API_KEY`: Injetado pelo processo de build do Vite.
//    - O arquivo `vite.config.ts` foi atualizado para usar a variável de ambiente `VITE_IA_API_KEY` (preferencial)
//      ou `IA_API_KEY` (como fallback) do seu ambiente Vercel.
//    - Isso garante que, se você definir `IA_API_KEY` na Vercel, o app funcionará.
const API_KEY = process.env.API_KEY || (import.meta as any).env?.VITE_IA_API_KEY;

if (!API_KEY) {
  throw new Error("Chave de API do Gemini não encontrada. Verifique se a API_KEY está configurada no ambiente do AI Studio ou se VITE_IA_API_KEY (ou IA_API_KEY) está definida nas variáveis de ambiente do seu projeto Vercel.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const imageModel = 'gemini-2.5-flash-image';
const textModel = 'gemini-2.5-flash';

const createImageProcessingPrompt = (pieceCount: PieceCount): string => {
  const pieceIdentifier = pieceCount === PieceCount.SET
    ? "Identifique TODAS as peças de roupa que compõem o conjunto na imagem (ex: camisa, short e tênis)."
    : "Identifique a peça de roupa principal (vestido, camiseta, etc.).";

  const resultDescription = pieceCount === PieceCount.SET
    ? "uma imagem PNG contendo APENAS o conjunto completo de peças de roupa"
    : "uma imagem PNG contendo APENAS a peça de roupa principal";

  return `A partir da imagem fornecida, execute as seguintes tarefas em ordem:
1. ${pieceIdentifier}
2. Remova completamente todos os outros elementos, incluindo o fundo, acessórios não pertencentes à(s) peça(s) (sapatos, laços, tiaras, brinquedos, etiquetas), e qualquer parte do corpo humano ou cabides.
3. Se um acessório estiver sobre uma das peças, use inpainting para reconstruir de forma realista o tecido por baixo, mantendo a textura, cor e padrão originais.
4. O resultado final DEVE SER ${resultDescription}, centralizado, sobre um fundo 100% transparente.`;
};


const createTextGenerationPrompt = (options: GenerationOptions) => {
  const { gender, age, theme, background, pieceCount } = options;

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

  const pieceTypeInstruction = pieceCount === PieceCount.SET
    ? "A imagem contém um conjunto de roupas. Descreva o conjunto (ex: 'Conjunto de camiseta, short e tênis')."
    : "A imagem contém uma peça de roupa única. Descreva a peça (ex: 'Vestido floral vermelho').";

  return `Recebe: imagem limpa (imagem final da peça ou conjunto sem fundo).

Tarefa 1 — Descrição curta:
Crie uma descrição breve e objetiva no formato:
[tipo da peça ou conjunto] [característica principal] [cor ou estampa]
${pieceTypeInstruction}
Exemplos: "Vestido floral vermelho", "Conjunto listrado azul com tênis branco", "Macacão jeans claro".
A descrição deve ter no máximo 10 palavras e ser direta.

Tarefa 2 — Comando de continuação para geração de modelo:
Usando a descrição que você gerou na Tarefa 1 para preencher o campo [DESCRIÇÃO], crie o comando de continuação EXATAMENTE no seguinte formato:
"${continuationCommandTemplate}"

Tarefa 3 - Post para Redes Sociais:
Crie um texto para um post de Instagram para a marca Lui Bambini. O post deve ser cativante, usar a descrição da peça de forma criativa, incluir emojis relevantes e terminar com 3 a 5 hashtags populares de moda infantil (ex: #modainfantil, #lookinhododia, #luibambini, #maedemenina, #maedemenino).

Regras:
- Use apenas as informações visuais na imagem limpa.
- Não adicione nem elimine detalhes da peça.
- Responda com um objeto JSON contendo as chaves "description", "command" e "socialMediaPost".`;
};

const modelImageSystemInstruction = `Você é um especialista em IA para fotografia de moda infantil, com um olhar meticuloso para detalhes. Sua tarefa segue um processo de duas etapas: Geração e Auto-Correção Crítica.

**Regras Imperativas:**

1.  **Fidelidade Absoluta à Peça**: Você receberá uma imagem 'limpa' (o que vestir) e imagens 'originais' (como deve parecer). Sua prioridade MÁXIMA é a fidelidade às imagens originais de referência. Preserve 100% das cores, estampas, texturas, bordados, costuras e proporções. NÃO redesenhe ou altere a(s) peça(s).
2.  **Uso das Imagens de Referência**: Use a imagem 'limpa' para aplicar sobre o corpo do modelo. Use as imagens 'originais' para recriar todos os detalhes com perfeição.
3.  **Ajuste de Tamanho e Caimento**: Adapte a(s) peça(s) proporcionalmente à faixa etária solicitada no prompt. O caimento, dobras, iluminação e perspectiva devem parecer naturais, mas o resultado final deve ser idêntico às referências.
4.  **Acessórios e Cenário**: Adicione acessórios e crie um cenário que correspondam ao prompt, mas que não modifiquem a(s) peça(s) principal(is).
5.  **Segurança e Respeito**: As poses devem ser apropriadas para a idade da criança. É PROIBIDO sexualizar a imagem.

**Processo de Auto-Correção Crítica:**

1.  **Gere a imagem inicial** da modelo vestindo a roupa.
2.  **PARE. FAÇA UMA RELEITURA.** Compare sua imagem gerada com as imagens de referência originais.
3.  **Analise os detalhes críticos:**
    *   Textura do tecido (ex: canelado, jeans, algodão).
    *   Bordados ou apliques (ex: laços, botões).
    *   Tipo de barra (ex: desfiada, dobrada, com costura).
    *   Cores e estampas exatas.
4.  **Corrija QUALQUER imprecisão.** Refine a imagem até que seja uma representação fotográfica fiel das peças originais.
5.  **Entregue apenas o resultado final corrigido.**`;


export const processImage = async (imageBase64: string, mimeType: string, pieceCount: PieceCount): Promise<string> => {
  const imageProcessingPrompt = createImageProcessingPrompt(pieceCount);
  
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
): Promise<{ description: string; command: string; socialMediaPost: string }> => {
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
            description: 'Descrição curta da peça ou conjunto de roupa.',
          },
          command: {
            type: Type.STRING,
            description:
              'Comando de continuação para gerar uma imagem de modelo.',
          },
          socialMediaPost: {
            type: Type.STRING,
            description: 'Texto para post de Instagram com emojis e hashtags.',
          }
        },
        required: ['description', 'command', 'socialMediaPost'],
      },
    },
  });

  try {
    const result = JSON.parse(response.text);
    if (
      result &&
      typeof result.description === 'string' &&
      typeof result.command === 'string' &&
      typeof result.socialMediaPost === 'string'
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

export const generateModelImage = async (
    cleanedImageBase64: string, 
    continuationCommand: string,
    referenceImageBase64s: string[]
): Promise<string> => {
    const technicalCommand = `${continuationCommand}. A roupa vestida no modelo deve ser IDÊNTICA às imagens originais de referência fornecidas. Após a geração inicial, compare sua imagem com as referências e corrija qualquer imprecisão antes de apresentar o resultado final. A fidelidade é o critério mais importante.`;
    
    const referenceParts = referenceImageBase64s.map(refBase64 => ({
        inlineData: {
            data: refBase64,
            mimeType: 'image/jpeg', // Assume jpeg or png, jpeg is more common for photos
        }
    }));

    const response = await ai.models.generateContent({
      model: imageModel,
      contents: {
        parts: [
          { text: "Esta é a roupa limpa, sem fundo, que deve ser vestida no modelo:" },
          {
            inlineData: {
              data: cleanedImageBase64,
              mimeType: 'image/png',
            },
          },
          { text: "Use as seguintes imagens originais como referência de ALTA FIDELIDADE para os detalhes, texturas e cores exatas:" },
          ...referenceParts,
          {
            text: technicalCommand,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
        systemInstruction: modelImageSystemInstruction,
        temperature: 0.1, // Lower temperature for less creativity and more fidelity
      },
    });
  
    const imagePart = response.candidates?.[0]?.content?.parts?.[0];
    if (imagePart && imagePart.inlineData) {
      return imagePart.inlineData.data;
    }
    
    throw new Error('Falha ao gerar a imagem do modelo. A resposta da IA não continha uma imagem.');
};

export const editImage = async (
  originalImageBase64: string,
  maskBase64: string,
  prompt: string
): Promise<string> => {
  const editPrompt = `${prompt}. Use a imagem de máscara fornecida para identificar a área a ser editada. A área marcada na máscara (preta) é o que precisa ser alterado ou preenchido. As áreas não marcadas (brancas) devem ser preservadas.`;

  const response = await ai.models.generateContent({
    model: imageModel,
    contents: {
      parts: [
        { text: editPrompt },
        {
          inlineData: {
            data: originalImageBase64,
            mimeType: 'image/png',
          },
        },
        {
          inlineData: {
            data: maskBase64,
            mimeType: 'image/png',
          },
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

  throw new Error('Falha ao editar a imagem. A resposta da IA não continha uma imagem.');
};