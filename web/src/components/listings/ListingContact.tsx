"use client";

import { ButtonLink } from "@/components/ui/Button";
import { useT } from "@/i18n/client";
import { whatsappUrl } from "@/lib/listings/rules";

/** Call, WhatsApp and social-page buttons for a listing (only the ones it has). */
export function ListingContact({
  phone,
  whatsapp,
  socialUrl,
  name,
}: {
  phone: string | null;
  whatsapp: string | null;
  socialUrl: string | null;
  name: string;
}) {
  const t = useT();
  if (!phone && !whatsapp && !socialUrl) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {phone ? (
        <ButtonLink href={`tel:${phone}`} icon="phone" aria-label={`${t("listing.call")}: ${name}`}>
          {t("listing.call")} <span className="num">{phone}</span>
        </ButtonLink>
      ) : null}
      {whatsapp ? (
        <ButtonLink
          href={whatsappUrl(whatsapp)}
          icon="whatsapp"
          variant="secondary"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t("listing.whatsapp")}: ${name}`}
        >
          {t("listing.whatsapp")}
        </ButtonLink>
      ) : null}
      {socialUrl ? (
        <ButtonLink
          href={socialUrl}
          icon="external"
          variant="secondary"
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          aria-label={`${t("listing.social")}: ${name}`}
        >
          {t("listing.social")}
        </ButtonLink>
      ) : null}
    </div>
  );
}
