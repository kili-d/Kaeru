import { useEffect, useState } from "react";

function resolveInitialValue(initialValue) {
  return typeof initialValue === "function" ? initialValue() : initialValue;
}

export function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return resolveInitialValue(initialValue);

    try {
      const saved = window.localStorage.getItem(key);
      return saved ? JSON.parse(saved) : resolveInitialValue(initialValue);
    } catch {
      return resolveInitialValue(initialValue);
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Keep the app usable if storage is unavailable or full.
    }
  }, [key, value]);

  return [value, setValue];
}
