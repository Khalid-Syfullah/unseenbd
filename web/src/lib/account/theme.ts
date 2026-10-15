import { setThemePref } from "@/lib/theme";
import type { AccountUser } from "./client";

/** Applies the theme saved in the account, if the user chose one. */
export function applyThemeFromAccount(user: Pick<AccountUser, "theme">) {
  if (user.theme && typeof window !== "undefined") setThemePref(user.theme);
}
