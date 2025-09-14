import { messages_ko } from './messages_ko'

// 추후 다국어 확장 가능
const locales = {
  ko: messages_ko,
}

export type LocaleKey = keyof typeof locales

let currentLocale: LocaleKey = 'ko'

export function setLocale(locale: LocaleKey) {
  if (locales[locale]) currentLocale = locale
}

export function t(key: string): string {
  const dict = locales[currentLocale] as Record<string, string>
  return dict[key] || key
}
