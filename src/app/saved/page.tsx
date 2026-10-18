import { Bookmark } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/ComingSoon";

export async function generateMetadata() {
  const t = await getTranslations("comingSoon");
  return {
    title: t("savedTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function SavedPage() {
  const t = await getTranslations("comingSoon");
  return <ComingSoon icon={Bookmark} title={t("savedTitle")} body={t("savedBody")} />;
}
