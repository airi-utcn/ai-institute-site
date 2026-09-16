"use client";
import React from 'react';
import { useLocale } from "@/context/LocaleContext";

const translations = {
  en: "This content is not yet available in the selected language. Displaying the English version.",
  ro: "Acest conținut nu este încă disponibil în limba selectată. Se afișează versiunea în limba engleză.",
  fr: "Ce contenu n'est pas encore disponible dans la langue sélectionnée. Affichage de la version anglaise.",
  de: "Dieser Inhalt ist in der ausgewählten Sprache noch nicht verfügbar. Die englische Version wird angezeigt.",
  es: "Este contenido aún no está disponible en el idioma seleccionado. Mostrando la versión en inglés.",
  it: "Questo contenuto non è ancora disponibile nella lingua selezionata. Visualizzazione della versione inglese."
};

export default function FallbackDisclaimer({ isFallback = false }) {
  const { locale } = useLocale();

  if (!isFallback) return null;

  const text = translations[locale] || translations.en;

  return (
    <div className="w-full bg-yellow-50 border-b border-yellow-200 py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-center space-x-3">
        <svg 
          className="w-5 h-5 text-yellow-600 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <p className="text-sm text-yellow-700 font-medium">
          {text}
        </p>
      </div>
    </div>
  );
}
