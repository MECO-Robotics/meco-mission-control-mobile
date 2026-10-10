import { ar } from "./ar";
import { de } from "./de";
import { arDemo } from "./demo/ar";
import { deDemo } from "./demo/de";
import { esDemo } from "./demo/es";
import { frDemo } from "./demo/fr";
import { heDemo } from "./demo/he";
import { nlDemo } from "./demo/nl";
import { ptDemo } from "./demo/pt";
import { trDemo } from "./demo/tr";
import { zhDemo } from "./demo/zh";
import { es } from "./es";
import { fr } from "./fr";
import { he } from "./he";
import { nl } from "./nl";
import { pt } from "./pt";
import { tr } from "./tr";
import { zh } from "./zh";

export type LanguageCode = "en" | "tr" | "he" | "fr" | "zh" | "es" | "pt" | "nl" | "de" | "ar";

export const translations: Record<Exclude<LanguageCode, "en">, Record<string, string>> = {
  ar: { ...ar, ...arDemo },
  de: { ...de, ...deDemo },
  es: { ...es, ...esDemo },
  fr: { ...fr, ...frDemo },
  he: { ...he, ...heDemo },
  nl: { ...nl, ...nlDemo },
  pt: { ...pt, ...ptDemo },
  tr: { ...tr, ...trDemo },
  zh: { ...zh, ...zhDemo },
};

export const rtlLanguages = new Set<LanguageCode>(["ar", "he"]);
