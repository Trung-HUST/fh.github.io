import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  
  const languages = ["en", "vi", "zh"];
  const labels: Record<string, string> = { en: "EN", vi: "VI", zh: "中" };
  const currentLang = i18n.language?.substring(0, 2) || "en";
  const currentIndex = languages.indexOf(currentLang) !== -1 ? languages.indexOf(currentLang) : 0;
  const nextLang = languages[(currentIndex + 1) % languages.length];
  const label = labels[currentLang] || "EN";

  return (
    <button
      onClick={() => i18n.changeLanguage(nextLang)}
      className="flex h-7 items-center justify-center px-1.5 font-mono text-[10px] text-matrix-dim hover:text-matrix-primary transition-colors"
      aria-label={`Switch language to ${nextLang}`}
    >
      [{label}]
    </button>
  );
}
