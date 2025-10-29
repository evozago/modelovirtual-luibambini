import { useState, useEffect, useCallback } from 'react';

function getStorageValue(key, defaultValue) {
  // Garante que o código só rode no navegador
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Falha ao analisar o JSON armazenado:", e);
        return defaultValue;
      }
    }
  }
  return defaultValue;
}

export const usePersistentState = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue);
  });

  // Efeito para salvar no localStorage sempre que o valor mudar
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Falha ao salvar no localStorage:", e);
    }
  }, [key, value]);

  // Efeito para ouvir mudanças no localStorage (de outras abas ou do nosso script)
  const handleStorageChange = useCallback((event) => {
    // O evento 'storage' nativo só dispara para outras abas.
    // O script da loja dispara um evento customizado ou um StorageEvent para garantir a atualização.
    if (event.key === key || event.type === 'storage') {
        setValue(getStorageValue(key, defaultValue));
    }
  }, [key, defaultValue]);

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStorageChange]);


  return [value, setValue];
};
