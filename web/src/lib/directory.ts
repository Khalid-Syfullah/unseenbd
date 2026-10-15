/**
 * The seeded directory (hotels, resorts, restaurants, shopping malls): its Bengali category and
 * area words in English, the area chips of each page and the Google Maps link.
 */

export const DIRECTORY_SECTIONS = ["hotels", "resorts", "restaurants", "shopping"] as const;
export type DirectorySection = (typeof DIRECTORY_SECTIONS)[number];

const CATEGORY_EN: Record<string, string> = {
  "৫-তারকা হোটেল": "5-star hotel",
  "সার্ভিসড আবাসন": "Serviced apartments",
  হোটেল: "Hotel",
  রিসোর্ট: "Resort",
  রেস্তোরাঁ: "Restaurant",
  "এশিয়ান ফিউশন": "Asian fusion",
  "গ্রিল রেস্তোরাঁ": "Grill restaurant",
  স্টেকহাউস: "Steakhouse",
  কফিশপ: "Coffee shop",
  "শপিং মল": "Shopping mall",
};

const AREA_EN: Record<string, string> = {
  ঢাকা: "Dhaka",
  চট্টগ্রাম: "Chattogram",
  খুলনা: "Khulna",
  বান্দরবান: "Bandarban",
  ইনানী: "Inani",
  কক্সবাজার: "Cox's Bazar",
  শ্রীমঙ্গল: "Sreemangal",
  "সেন্ট মার্টিন": "St Martin's",
  সাজেক: "Sajek",
  নারায়ণগঞ্জ: "Narayanganj",
  গুলশান: "Gulshan",
  মিরপুর: "Mirpur",
  মহাখালী: "Mohakhali",
  ধানমন্ডি: "Dhanmondi",
  বসুন্ধরা: "Bashundhara",
  বারিধারা: "Baridhara",
};

/** The category in the content language (Bengali as stored, English from the word list). */
export function categoryText(bn: string | null, lang: "bn" | "en"): string {
  if (!bn) return "";
  return lang === "bn" ? bn : (CATEGORY_EN[bn] ?? bn);
}

/** An area such as `গুলশান, ঢাকা` in the content language, part by part. */
export function areaText(bn: string | null, lang: "bn" | "en"): string {
  if (!bn) return "";
  if (lang === "bn") return bn;
  return bn
    .split(/\s*,\s*/)
    .map((part) => AREA_EN[part] ?? part)
    .join(", ");
}

/**
 * The chip an item belongs to: the city for hotels, restaurants and malls (`গুলশান, ঢাকা` →
 * Dhaka); the named place for resorts (Inani and Cox's Bazar are separate chips).
 */
export function areaChip(section: DirectorySection, areaBn: string | null): string {
  const parts = (areaBn ?? "").split(/\s*,\s*/).filter(Boolean);
  if (!parts.length) return "";
  return section === "resorts" ? parts[0]! : parts[parts.length - 1]!;
}

/** Google Maps search for a place by name and area. */
export function googleMapsUrl(name: string, areaBn: string | null): string {
  const area = areaText(areaBn, "en");
  const query = [name, area, "Bangladesh"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
