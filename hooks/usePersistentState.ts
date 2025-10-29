
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
    // When we set an item, we dispatch a custom event that our external script can listen to if needed.
    // However, the primary mechanism is the external script updating localStorage and this hook reacting.
  }, [key, value]);

  // This effect listens for changes made in other tabs or by our external script
  const handleStorageChange = useCallback((event: StorageEvent | Event) => {
    // The 'storage' event is only fired for changes in other documents (tabs/windows)
    // For same-page changes (our external script), we dispatch a custom event or check the key directly
    let eventKey: string | null = null;
    if ('key' in event) { // For real StorageEvent
        eventKey = event.key;
    }
    
    // The custom event we fire in index.tsx doesn't have a key, so we'll just re-sync
    if (event.type === 'storage' && eventKey === key) {
        setValue(getStorageValue(key, defaultValue));
    } else if (event.type === 'storage' && eventKey === null) {
        // This handles our custom dispatched 'storage' event from index.tsx
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
