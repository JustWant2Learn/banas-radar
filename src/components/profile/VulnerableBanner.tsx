"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { vulnerableGroupLabel } from "@/lib/i18nLabels";
import { useProfileStore } from "@/store/useProfileStore";

export function VulnerableBanner() {
  const t = useTranslations();
  const locale = useLocale();
  const groups = useProfileStore((state) => state.groups);
  if (groups.length === 0) return null;

  const names = new Intl.ListFormat(locale === "fil" ? "fil" : "en", { type: "conjunction" }).format(
    groups.map((id) => vulnerableGroupLabel(t, id)),
  );

  return (
    <Alert className="border-primary/30 bg-primary/8 text-foreground shadow-md">
      <ShieldAlert />
      <AlertTitle>
        <Link href="/you" className="underline-offset-2 hover:underline">
          {t("vulnerable.bannerTitle")}
        </Link>
      </AlertTitle>
      <AlertDescription>{t("vulnerable.bannerBody", { groups: names })}</AlertDescription>
    </Alert>
  );
}
