import type { Locale } from "./locales";

/**
 * Interface strings for the temporary home page built in phase 01.
 * Phase 02 replaces these with the JSON message catalogues in src/i18n/.
 */
export type FoundationCopy = {
  title: string;
  description: string;
  lead: string;
  comingSoon: string;
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  languageLabel: string;
  logoAlt: string;
  notFoundTitle: string;
  notFoundBody: string;
  backHome: string;
};

export const FOUNDATION_COPY: Record<Locale, FoundationCopy> = {
  bn: {
    title: "Unseen BD — ৬৪ জেলার ভ্রমণ গাইড",
    description: "বাংলাদেশের ৬৪ জেলার জায়গা, পথ আর ভ্রমণ পরিকল্পনা, এক জায়গায়।",
    lead: "বাংলাদেশের ৬৪ জেলা ঘুরে দেখার গাইড — কোথায় যাবেন, কখন যাবেন, কীভাবে যাবেন।",
    comingSoon: "সাইটটি তৈরি হচ্ছে। শিগগিরই দেখা হবে।",
    themeLabel: "থিম",
    themeLight: "আলো",
    themeDark: "অন্ধকার",
    themeSystem: "ডিভাইসের মতো",
    languageLabel: "ভাষা",
    logoAlt: "Unseen BD",
    notFoundTitle: "পাতাটি পাওয়া যায়নি",
    notFoundBody: "এই ঠিকানায় কিছু নেই। হোম পেজ থেকে আবার শুরু করুন।",
    backHome: "হোম পেজে ফিরুন",
  },
  en: {
    title: "Unseen BD — a travel guide to all 64 districts",
    description: "Places, routes and trip plans for all 64 districts of Bangladesh, in one guide.",
    lead: "A guide to all 64 districts of Bangladesh: where to go, when to go and how to get there.",
    comingSoon: "The site is being built. See you soon.",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    languageLabel: "Language",
    logoAlt: "Unseen BD",
    notFoundTitle: "Page not found",
    notFoundBody: "There is nothing at this address. Start again from the home page.",
    backHome: "Back to home",
  },
  zh: {
    title: "Unseen BD — 孟加拉国 64 个县的旅行指南",
    description: "孟加拉国 64 个县的景点、路线和行程规划，尽在一个指南。",
    lead: "孟加拉国 64 个县的旅行指南：去哪里、何时去、怎么去。",
    comingSoon: "网站正在建设中，敬请期待。",
    themeLabel: "主题",
    themeLight: "浅色",
    themeDark: "深色",
    themeSystem: "跟随系统",
    languageLabel: "语言",
    logoAlt: "Unseen BD",
    notFoundTitle: "找不到页面",
    notFoundBody: "此地址没有内容。请从首页重新开始。",
    backHome: "返回首页",
  },
  fr: {
    title: "Unseen BD — guide de voyage des 64 districts",
    description: "Lieux, itinéraires et plans de voyage pour les 64 districts du Bangladesh.",
    lead: "Un guide des 64 districts du Bangladesh : où aller, quand partir et comment s’y rendre.",
    comingSoon: "Le site est en construction. À très bientôt.",
    themeLabel: "Thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeSystem: "Système",
    languageLabel: "Langue",
    logoAlt: "Unseen BD",
    notFoundTitle: "Page introuvable",
    notFoundBody: "Il n’y a rien à cette adresse. Repartez de la page d’accueil.",
    backHome: "Retour à l’accueil",
  },
  de: {
    title: "Unseen BD — Reiseführer für alle 64 Distrikte",
    description: "Orte, Routen und Reisepläne für alle 64 Distrikte von Bangladesch.",
    lead: "Ein Reiseführer für alle 64 Distrikte von Bangladesch: wohin, wann und wie.",
    comingSoon: "Die Seite wird gerade gebaut. Bis bald.",
    themeLabel: "Design",
    themeLight: "Hell",
    themeDark: "Dunkel",
    themeSystem: "System",
    languageLabel: "Sprache",
    logoAlt: "Unseen BD",
    notFoundTitle: "Seite nicht gefunden",
    notFoundBody: "Unter dieser Adresse gibt es nichts. Fang auf der Startseite neu an.",
    backHome: "Zur Startseite",
  },
  it: {
    title: "Unseen BD — guida di viaggio ai 64 distretti",
    description: "Luoghi, percorsi e piani di viaggio per i 64 distretti del Bangladesh.",
    lead: "Una guida ai 64 distretti del Bangladesh: dove andare, quando partire e come arrivare.",
    comingSoon: "Il sito è in costruzione. A presto.",
    themeLabel: "Tema",
    themeLight: "Chiaro",
    themeDark: "Scuro",
    themeSystem: "Sistema",
    languageLabel: "Lingua",
    logoAlt: "Unseen BD",
    notFoundTitle: "Pagina non trovata",
    notFoundBody: "Non c’è niente a questo indirizzo. Riparti dalla home page.",
    backHome: "Torna alla home",
  },
  ja: {
    title: "Unseen BD — バングラデシュ全64県の旅行ガイド",
    description: "バングラデシュ全64県の見どころ、ルート、旅行プランをひとつに。",
    lead: "バングラデシュ全64県の旅行ガイド。どこへ、いつ、どうやって行くか。",
    comingSoon: "サイトは現在準備中です。もうしばらくお待ちください。",
    themeLabel: "テーマ",
    themeLight: "ライト",
    themeDark: "ダーク",
    themeSystem: "システム",
    languageLabel: "言語",
    logoAlt: "Unseen BD",
    notFoundTitle: "ページが見つかりません",
    notFoundBody: "このアドレスには何もありません。ホームからやり直してください。",
    backHome: "ホームに戻る",
  },
};
