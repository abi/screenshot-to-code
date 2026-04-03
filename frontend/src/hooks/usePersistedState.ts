import { Dispatch, SetStateAction, useEffect, useState } from 'react';

type PersistedState<T> = [T, Dispatch<SetStateAction<T>>];

function usePersistedState<T>(defaultValue: T, key: string): PersistedState<T> {
  const [value, setValue] = useState<T>(() => {
    const persistedValue = window.localStorage.getItem(key);
    if (!persistedValue) {
      return defaultValue;
    }

    try {
      return JSON.parse(persistedValue) as T;
    } catch (error) {
      console.warn(`Invalid JSON in localStorage for key "${key}". Resetting value.`, error);
      window.localStorage.removeItem(key);
      return defaultValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export { usePersistedState };
