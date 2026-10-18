import { getTranslations } from "next-intl/server";
import { FirstAidGuide } from "@/components/first-aid/FirstAidGuide";

export async function generateMetadata() {
  const t = await getTranslations("firstAid");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}

export default function FirstAidPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <FirstAidGuide />
    </div>
  );
}
