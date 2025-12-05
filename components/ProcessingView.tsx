

import React from 'react';
import type { ProcessingState } from '../types';
import { ProcessingStep } from '../types';
import { SparklesIcon, TextIcon, PersonIcon, BrushIcon, VideoCameraIcon } from './Icons';

interface ProcessingViewProps {
  state: ProcessingState;
}

const statusMessages: { [key in Exclude<ProcessingStep, 'IDLE' | 'DONE' | 'ERROR'>]: { icon: React.ReactNode; text: string; subtext: string; } } = {
  [ProcessingStep.CLEANING]: {
    icon: <SparklesIcon className="w-8 h-8 text-pink-500" />,
    text: 'Limpando a imagem...',
    subtext: 'A IA está removendo o fundo e acessórios. Isso pode levar alguns segundos.'
  },
  [ProcessingStep.GENERATING_TEXT]: {
    icon: <TextIcon className="w-8 h-8 text-pink-500" />,
    text: 'Gerando descrição...',
    subtext: 'A IA está criando o texto de marketing e o comando de continuação.'
  },
  [ProcessingStep.GENERATE_MODEL_IMAGE]: {
    icon: <PersonIcon className="w-8 h-8 text-pink-500" />,
    text: 'Gerando imagem do modelo...',
    subtext: 'A IA está vestindo a modelo com a sua peça. Isso pode demorar um pouco.'
  },
  [ProcessingStep.EDITING]: {
    icon: <BrushIcon className="w-8 h-8 text-pink-500" />,
    text: 'Aplicando edições...',
    subtext: 'A IA está corrigindo a imagem com base na sua solicitação. Um momento.'
  },
  [ProcessingStep.GENERATING_VIDEO]: {
    icon: <VideoCameraIcon className="w-8 h-8 text-pink-500" />,
    text: 'Gerando vídeo...',
    subtext: 'A IA está criando um pequeno vídeo do look. Isso pode levar alguns minutos!'
  },
};

export const ProcessingView: React.FC<ProcessingViewProps> = ({ state }) => {
  const currentStatus = statusMessages[state.step as keyof typeof statusMessages];
  
  if (!currentStatus) return null;

  return (
    <div className="flex flex-col items-center justify-center text-center h-full p-4 bg-pink-50 rounded-lg">
      <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 bg-pink-200 rounded-full animate-ping"></div>
          <div className="relative flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full">
            {currentStatus.icon}
          </div>
      </div>
      <h2 className="text-xl font-semibold text-gray-800">{currentStatus.text}</h2>
      <p className="text-gray-600 mt-2">{currentStatus.subtext}</p>
    </div>
  );
};