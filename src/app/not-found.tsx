import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("missingPage");
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="max-w-sm text-muted-foreground">{t("body")}</p>
      <Link href="/" className={buttonVariants()}>
        {t("back")}
      </Link>
    </section>
  );
}
