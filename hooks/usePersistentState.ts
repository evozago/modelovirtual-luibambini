import { useState, useEffect, useCallback } from 'react';

function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse stored JSON", e);
        return defaultValue;
      }
    }
  }
  return defaultValue;
}

export const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  const handleStorageChange = useCallback((event: StorageEvent | Event) => {
    let eventKey: string | null = null;
    if ('key' in event) { // For real StorageEvent
        eventKey = event.key;
    }
    
    // This handles both the native storage event (for other tabs) and our custom
    // dispatched event from index.tsx for same-page updates.
    if ((event.type === 'storage' && eventKey === key) || (event.type === 'storage' && eventKey === null)) {
        console.log(`[LookBuilder React] Storage change detected for key "${key}". Updating component state.`);
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
