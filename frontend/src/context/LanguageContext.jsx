import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'tafuta_lang';

export const LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'ksw', label: 'Kiswahili' },
  { code: 'kmb', label: 'Kikamba' },
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'eng'
  );

  const setLang = (code) => {
    localStorage.setItem(STORAGE_KEY, code);
    setLangState(code);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
