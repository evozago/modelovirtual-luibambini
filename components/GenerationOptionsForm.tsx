
import React from 'react';
import { GenerationOptions, Gender, Age, Theme, Background } from '../types';

interface GenerationOptionsProps {
  options: GenerationOptions;
  setOptions: React.Dispatch<React.SetStateAction<GenerationOptions>>;
}

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}> = ({ label, value, onChange, children }) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-gray-700 text-left mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
    >
      {children}
    </select>
  </div>
);

export const GenerationOptionsForm: React.FC<GenerationOptionsProps> = ({ options, setOptions }) => {
  const handleChange = (field: keyof GenerationOptions) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOptions(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="w-full mb-6 space-y-4">
       <h2 className="text-xl font-semibold text-gray-700 mb-4">Personalize a Imagem Gerada</h2>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Gênero" value={options.gender} onChange={handleChange('gender')}>
              {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
          </SelectField>
          <SelectField label="Idade" value={options.age} onChange={handleChange('age')}>
              {Object.values(Age).map(a => <option key={a} value={a}>{a}</option>)}
          </SelectField>
          <SelectField label="Tema" value={options.theme} onChange={handleChange('theme')}>
              {Object.values(Theme).map(t => <option key={t} value={t}>{t}</option>)}
          </SelectField>
          <SelectField label="Fundo (Opcional)" value={options.background || ''} onChange={handleChange('background')}>
              <option value="">IA Decide</option>
              {Object.values(Background).map(b => <option key={b} value={b}>{b}</option>)}
          </SelectField>
       </div>
    </div>
  );
};
