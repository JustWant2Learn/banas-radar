import { getTranslations } from "next-intl/server";
import { CoolingFinder } from "@/components/cooling/CoolingFinder";

export async function generateMetadata() {
  const t = await getTranslations("cooling");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}

export default function CoolingPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <CoolingFinder />
    </div>
  );
}
