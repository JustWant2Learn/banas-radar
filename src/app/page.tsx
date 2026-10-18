import { getTranslations } from "next-intl/server";
import { RadarView } from "@/components/map/RadarView";

export async function generateMetadata() {
  const t = await getTranslations("map");
  return { title: t("title") };
}

export default function RadarPage() {
  return <RadarView />;
}
