import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { Text as NativeText, type TextProps } from "react-native";

import { getDeviceLocale, setAppLocaleOverride } from "../ui/helpers";
import { languageNames, rtlLanguages, translations, type LanguageCode } from "./translations";

type I18nContextValue = {
  isRtl: boolean;
  language: LanguageCode;
  locale: string;
  t: (value: string) => string;
};

const I18nContext = createContext<I18nContextValue>({
  isRtl: false,
  language: "en",
  locale: "en",
  t: (value) => value,
});

const supportedLanguages = new Set<LanguageCode>([
  "en",
  "tr",
  "he",
  "fr",
  "zh",
  "es",
  "pt",
  "nl",
  "de",
  "ar",
]);

function resolveLanguage(locale: string): LanguageCode {
  const language = locale.split("-")[0]?.toLowerCase();

  return supportedLanguages.has(language as LanguageCode) ? (language as LanguageCode) : "en";
}

function preserveWhitespace(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";

  return `${leading}${translated}${trailing}`;
}

function capitalizeFirst(value: string) {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function translateDynamic(value: string, t: (text: string) => string): string {
  if (value.includes(" | ")) {
    return value.split(" | ").map((part) => translateDynamic(part, t)).join(" | ");
  }

  const ownerDueMatch = value.match(/^(.+) - (.+) - due (.+)$/u);

  if (ownerDueMatch) {
    return `${ownerDueMatch[1]} - ${ownerDueMatch[2]} - ${t("Due")} ${ownerDueMatch[3]}`;
  }

  const requesterMatch = value.match(/^(.+) - requester (.+)$/u);

  if (requesterMatch) {
    return `${requesterMatch[1]} - ${t("requester")} ${requesterMatch[2]}`;
  }

  const leadMentorsMatch = value.match(/^Lead (.+) - Mentors (.+)$/u);

  if (leadMentorsMatch) {
    return `${t("Lead")} ${leadMentorsMatch[1]} - ${t("Mentors")} ${leadMentorsMatch[2]}`;
  }

  const topAlphabeticalMatch = value.match(/^Top (\d+) alphabetically - tap for everyone$/u);

  if (topAlphabeticalMatch?.[1]) {
    return t("Top {count} alphabetically - tap for everyone").replace("{count}", topAlphabeticalMatch[1]);
  }

  const prefixPatterns: [RegExp, string][] = [
    [/^Owner (.+)$/u, "Owner"],
    [/^Due (.+)$/u, "Due"],
    [/^Milestone (.+)$/u, "Milestone"],
    [/^Mechanism (.+)$/u, "Mechanism"],
    [/^Part (.+)$/u, "Part"],
    [/^Task: (.+)$/u, "Task"],
    [/^Subsystem: (.+)$/u, "Subsystem"],
    [/^People: (.+)$/u, "People"],
    [/^Start (.+)$/u, "Start"],
    [/^End (.+)$/u, "End"],
    [/^Material (.+)$/u, "Material"],
    [/^Vendor (.+)$/u, "Vendor"],
    [/^Est (.+)$/u, "Est"],
    [/^Final (.+)$/u, "Final"],
    [/^Qty (.+)$/u, "Qty"],
    [/^Batch (.+)$/u, "Batch"],
    [/^Mentor (.+)$/u, "Mentor"],
    [/^Tracking (.+)$/u, "Tracking"],
    [/^Mechanisms (.+)$/u, "Mechanisms"],
    [/^Open tasks (.+)$/u, "Open tasks"],
    [/^Risks (.+)$/u, "Risks"],
    [/^Subsystems (.+)$/u, "Subsystems"],
    [/^Follow-up (.+)$/u, "Follow-up"],
    [/^Finding (.+)$/u, "Finding"],
  ];

  for (const [pattern, label] of prefixPatterns) {
    const match = value.match(pattern);

    if (match?.[1]) {
      return `${t(label)} ${match[1]}`;
    }
  }

  const priorityMatch = value.match(/^(.+) priority$/u);

  if (priorityMatch?.[1]) {
    return `${t(priorityMatch[1])} ${t("priority")}`;
  }

  return value;
}

function translateNode(node: ReactNode, t: (value: string) => string): ReactNode {
  if (typeof node === "string") {
    return t(node);
  }

  if (Array.isArray(node)) {
    const canJoinForTranslation = node.every((child) => typeof child === "string" || typeof child === "number");

    if (canJoinForTranslation) {
      return t(node.join(""));
    }

    return node.map((child) => translateNode(child, t));
  }

  return node;
}

export function LocalizationProvider({
  children,
  languageOverride,
}: {
  children: ReactNode;
  languageOverride?: LanguageCode | null;
}) {
  const locale = getDeviceLocale();
  const language = languageOverride ?? resolveLanguage(locale);
  setAppLocaleOverride(languageOverride ?? null);
  return <ResolvedLocalizationProvider language={language} locale={locale}>{children}</ResolvedLocalizationProvider>;
}

export function ResolvedLocalizationProvider({
  children,
  language,
  locale,
}: {
  children: ReactNode;
  language: LanguageCode;
  locale: string;
}) {
  const isRtl = rtlLanguages.has(language);
  const dictionary = language === "en" ? null : translations[language];
  const value = useMemo<I18nContextValue>(() => {
    const t = (source: string) => {
      const trimmed = source.trim();

      if (!trimmed || !dictionary) {
        return source;
      }

      const translated =
        dictionary[trimmed] ??
        dictionary[capitalizeFirst(trimmed)] ??
        dictionary[trimmed.toUpperCase()] ??
        translateDynamic(trimmed, (text) => dictionary[text] ?? dictionary[capitalizeFirst(text)] ?? text);

      return preserveWhitespace(source, translated);
    };

    return { isRtl, language, locale, t };
  }, [dictionary, isRtl, language, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}

export function Text({ children, ...props }: TextProps) {
  const { isRtl, t } = useTranslation();
  const style = isRtl ? [props.style, { writingDirection: "rtl" as const }] : props.style;

  return (
    <NativeText {...props} style={style}>
      {translateNode(children, t)}
    </NativeText>
  );
}

export { languageNames };
export type { LanguageCode };
