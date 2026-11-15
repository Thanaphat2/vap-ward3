import { useEffect, useState } from 'react';

/** state ที่จำค่าไว้ใน localStorage (ตรวจค่าที่อ่านมาด้วย validate ถ้าระบุ) */
export function useLocalStorageState<T extends string>(
  key: string,
  fallback: T,
  validate?: (value: string) => boolean
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null && (!validate || validate(stored))) return stored as T;
    } catch {
      /* localStorage ใช้ไม่ได้ (private mode ฯลฯ) */
    }
    return fallback;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
