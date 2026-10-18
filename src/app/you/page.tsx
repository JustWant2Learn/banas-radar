import { getTranslations } from "next-intl/server";
import { VulnerableMode } from "@/components/profile/VulnerableMode";

export async function generateMetadata() {
  const t = await getTranslations("vulnerable");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}

export default function YouPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <VulnerableMode />
    </div>
  );
}
