/**
 * Site-wide settings that an editor may want to change without touching components.
 * The partner banner on the home page is switched off by setting `enabled` to false.
 */

type Bilingual = { bn: string; en: string };

export type PartnerBannerConfig = {
  /** Show the banner on the home page at all. */
  enabled: boolean;
  /** Partner name, shown in the banner. */
  name: string;
  /** Partner site. Opens in a new tab, marked `sponsored`. */
  url: string;
  /** One sentence about what the partner offers. */
  text: Bilingual;
  /** Short category chips under the sentence; may be empty. */
  categories: Bilingual[];
};

export const PARTNER_BANNER: PartnerBannerConfig = {
  enabled: true,
  name: "Deshtool.com",
  url: "https://deshtool.com",
  text: {
    bn: "ভ্রমণের আগে দরকারি জিনিসপত্র আর সেবা এক জায়গায় খুঁজে নিন।",
    en: "Find the gear and services you need before you travel, all in one place.",
  },
  categories: [
    { bn: "ভ্রমণ সামগ্রী", en: "Travel gear" },
    { bn: "ব্যাগ ও লাগেজ", en: "Bags and luggage" },
    { bn: "উপহার", en: "Gifts" },
  ],
};

/** Local-storage key that remembers a dismissed partner banner (per partner URL). */
export const PARTNER_BANNER_DISMISS_KEY = "unseenbd.partnerBanner.dismissed";
