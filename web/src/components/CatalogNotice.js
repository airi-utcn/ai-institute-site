"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/context/LocaleContext";

// It's not worth it to import it dynamically from Strapi
// Some text should stay static, it's absurd to move everything there.

const translations = {
  en: {
    note: "Showing content available in English. Some items are only available in English.",
    action: "Switch to English for the complete catalog",
    empty: "No items are available in English in this section yet.",
    emptyAction: "View the complete catalog in English",
    clearFilters: "Clear filters",
  },

  ro: {
    note: "Afișare conținut tradus în limba română. Unele articole sunt publicate doar în limba engleză.",
    action: "Comutați pe English pentru catalogul complet",
    empty: "Niciun element nu a fost tradus încă în limba română în această secțiune.",
    emptyAction: "Vezi tot catalogul în limba engleză (English)",
    clearFilters: "Resetează filtrele",
  },

  fr: {
    note: "Affichage du contenu disponible en français. Certains éléments ne sont disponibles qu'en anglais.",
    action: "Passer à l'anglais pour le catalogue complet",
    empty: "Aucun élément n'est encore disponible en français dans cette section.",
    emptyAction: "Voir tout le catalogue en anglais (English)",
    clearFilters: "Effacer les filtres",
  },

  de: {
    note: "Inhalte werden auf Deutsch angezeigt. Einige Einträge sind nur auf Englisch verfügbar.",
    action: "Auf Englisch umschalten für das vollständige Verzeichnis",
    empty: "In diesem Bereich sind noch keine Einträge auf Deutsch verfügbar.",
    emptyAction: "Vollständiges Verzeichnis auf Englisch anzeigen",
    clearFilters: "Filter zurücksetzen",
  },

  es: {
    note: "Mostrando contenido disponible en español. Algunos elementos solo están disponibles en inglés.",
    action: "Cambiar a inglés para ver el catálogo completo",
    empty: "No hay elementos disponibles en español en esta sección todavía.",
    emptyAction: "Ver todo el catálogo en inglés (English)",
    clearFilters: "Borrar filtros",
  },

  it: {
    note: "Visualizzazione dei contenuti disponibili in italiano. Alcuni elementi sono disponibili solo in inglese.",
    action: "Passa all'inglese per il catalogo completo",
    empty: "Nessun elemento ancora disponibile in italiano in questa sezione.",
    emptyAction: "Visualizza tutto il catalogo in inglese (English)",
    clearFilters: "Cancella filtri",
  },

  el: {
    note: "Εμφάνιση περιεχομένου διαθέσιμου στα Ελληνικά. Ορισμένα στοιχεία είναι διαθέσιμα μόνο στα Αγγλικά.",
    action: "Μετάβαση στα Αγγλικά για τον πλήρη κατάλογο",
    empty: "Δεν υπάρχουν ακόμη διαθέσιμα στοιχεία στα Ελληνικά σε αυτήν την ενότητα.",
    emptyAction: "Προβολή ολόκληρου του καταλόγου στα Αγγλικά (English)",
    clearFilters: "Εκκαθάριση φίλτρων",
  },

  tr: {
    note: "Türkçe olarak sunulan içerik gösteriliyor. Bazı öğeler yalnızca İngilizce olarak sunulmaktadır.",
    action: "Eksiksiz katalog için İngilizceye geçin",
    empty: "Bu bölümde henüz Türkçe kullanılabilir bir öğe yok.",
    emptyAction: "Eksiksiz kataloğu İngilizce görüntüle (English)",
    clearFilters: "Filtreleri temizle",
  },

  bg: {
    note: "Показва се съдържание, налично на български език. Някои елементи са налични само на английски.",
    action: "Превключете на английски за пълния каталог",
    empty: "В този раздел все още няма елементи, налични на български език.",
    emptyAction: "Вижте целия каталог на английски език (English)",
    clearFilters: "Изчисти филтрите",
  },

  lv: {
    note: "Tiek rādīts latviešu valodā pieejamais saturs. Daži vienumi ir pieejami tikai angļu valodā.",
    action: "Pārslēdzieties uz angļu valodu, lai skatītu pilnu katalogu",
    empty: "Šajā sadaļā vēl nav pieejams neviens vienums latviešu valodā.",
    emptyAction: "Skatīt visu katalogu angļu valodā (English)",
    clearFilters: "Notīrīt filtrus",
  },

  zh: {
    note: "显示简体中文内容。部分内容仅提供英文版本。",
    action: "切换到英语以查看完整目录",
    empty: "此部分暂时没有可用的简体中文内容。",
    emptyAction: "查看完整的英语目录（English）",
    clearFilters: "清除筛选条件",
  },
};

export default function CatalogNotice({
  isEmpty = false,
  className = "",
  dismissKey = "catalog-notice-dismissed",
  hasActiveFilters = false,
  onClearFilters = null,
  emptyMessage = null,
}) {
  const locale = useLocale();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && dismissKey && !isEmpty) {
      try {
        if (sessionStorage.getItem(dismissKey) === "true") {
          setDismissed(true);
        }
      } catch (e) {}
    }
  }, [dismissKey, isEmpty]);

  const t = translations[locale] || translations.en;

  const switchToEnglish = () => {
    document.cookie = "NEXT_LOCALE=en; path=/; max-age=31536000; SameSite=Lax";
    window.location.reload();
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined" && dismissKey) {
      try {
        sessionStorage.setItem(dismissKey, "true");
      } catch (e) {}
    }
  };

  // Option B: Empty State
  if (isEmpty) {
    const isDefaultLocale = !locale || locale === "en";

    if (isDefaultLocale) {
      return (
        <div className={`empty-state text-center py-12 ${className}`}>
          <p className="text-gray-600 dark:text-gray-400">
            {emptyMessage || t.empty}
          </p>
          {hasActiveFilters && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="btn btn-secondary mt-4 inline-block"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      );
    }

    // Localized empty state
    return (
      <div
        className={`rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 p-8 text-center my-6 ${className}`}
      >
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
        </div>
        <p className="text-base font-medium text-gray-800 dark:text-gray-200 max-w-md mx-auto">
          {t.empty}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={switchToEnglish}
            className="btn btn-primary inline-flex items-center gap-2 shadow-sm"
          >
            <span>🇬🇧</span>
            <span>{t.emptyAction}</span>
          </button>
          {hasActiveFilters && onClearFilters && (
            <button onClick={onClearFilters} className="btn btn-secondary">
              {t.clearFilters}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Option A: Subtle Inline Notice (only for non-default locales)
  if (!locale || locale === "en" || dismissed) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-gray-200/70 dark:border-gray-800/80 bg-gray-50/80 dark:bg-gray-900/40 text-xs sm:text-sm text-gray-600 dark:text-gray-400 transition-all ${className}`}
      role="note"
      aria-label="Language availability notice"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
        <svg
          className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          {t.note}{" "}
          <button
            onClick={switchToEnglish}
            className="font-medium text-primary-600 dark:text-accent-400 hover:underline inline-flex items-center gap-1 ml-1 cursor-pointer"
          >
            <span>{t.action}</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 -mr-1 rounded-md transition-colors cursor-pointer"
        aria-label="Dismiss notice"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
