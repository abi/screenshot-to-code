import { Dispatch, SetStateAction, useEffect, useState } from "react";

type PersistedState<T> = [T, Dispatch<SetStateAction<T>>];

function readPersistedValue<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as T) : defaultValue;
  } catch (error) {
    console.error(`Failed to parse persisted state for "${key}"`, error);

    try {
      window.localStorage.removeItem(key);
    } catch (removeError) {
      console.error(`Failed to clear persisted state for "${key}"`, removeError);
    }

    return defaultValue;
  }
}

function usePersistedState<T>(defaultValue: T, key: string): PersistedState<T> {
  const [value, setValue] = useState<T>(() => readPersistedValue(key, defaultValue));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to persist state for "${key}"`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

export { usePersistedState };
